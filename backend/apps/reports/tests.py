"""
SmartMove Reports — Automated Test Suite

Covers:
    1. Authentication gate    — unauthenticated users are blocked (401)
    2. Premium paywall bypass — DATA_ANALYST / ADMIN see all, full access
    3. Tiered paywall         — USER role gets age-restricted access
    4. M2M webhook auth       — build-pdf endpoint validates X-Airflow-API-Key
    5. Edge cases             — unpublished reports, empty secrets, idempotent updates

Run:
    python manage.py test apps.reports -v 2 --settings=config.settings.base
"""

from datetime import timedelta
from typing import Any
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.reports.models import Report, ReportActivityLog
from apps.users.models import User


# ═════════════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════════════

REPORTS_LIST_URL = '/api/reports/'
BUILD_PDF_URL = '/api/reports/build-pdf/'

# Shared secret used across all webhook tests
TEST_AIRFLOW_SECRET = 'test-airflow-secret-42'


def _month_offset(months_ago: int) -> tuple[int, int]:
    """
    Return (month, year) that is ``months_ago`` months before *now*.

    Example:
        If today is 2026-05-16 and months_ago=4, returns (1, 2026).
    """
    now = timezone.now()
    total_months = now.year * 12 + now.month - months_ago
    year = (total_months - 1) // 12
    month = (total_months - 1) % 12 + 1
    return month, year


def _create_report(region: str = 'dubai', months_ago: int = 0, **kwargs) -> Report:
    """Factory helper — creates a published Report at the given age."""
    month, year = _month_offset(months_ago)
    defaults = {
        'region': region,
        'report_month': month,
        'report_year': year,
        'title': f'Test Report — {month:02d}/{year}',
        'azure_blob_url': f'https://smartmovesa.blob.core.windows.net/reports/{region}/{year}/{month:02d}.pdf',
        'file_size_bytes': 102400,
        'is_published': True,
    }
    defaults.update(kwargs)
    return Report.objects.create(**defaults)  # type: ignore[attr-defined]


def _create_user(email: str, role: str = 'USER') -> User:
    """Factory helper — creates a user with the given role."""
    return User.objects.create_user(email=email, password='TestPass123!', role=role)  # type: ignore


# ═════════════════════════════════════════════════════════════════════════════
# 1. Authentication Gate
# ═════════════════════════════════════════════════════════════════════════════

class TestUnauthenticatedAccess(APITestCase):
    """
    Verify that the reports list endpoint enforces authentication.
    """

    def test_unauthenticated_user_blocked(self):
        """
        GET /api/reports/ without credentials → 401 Unauthorized.

        The global default permission class (IsAuthenticated) must reject
        anonymous requests before the paywall logic even runs.
        """
        client = APIClient()
        response: Any = client.get(REPORTS_LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ═════════════════════════════════════════════════════════════════════════════
# 2. Premium User — Full Access
# ═════════════════════════════════════════════════════════════════════════════

class TestPremiumUserFullAccess(APITestCase):
    """
    DATA_ANALYST and ADMIN users bypass the paywall entirely.
    All reports are visible with can_view=True and can_download=True,
    regardless of report age.
    """

    def setUp(self):
        """Create reports spanning the full paywall age range."""
        self.report_fresh = _create_report(months_ago=0, region='dubai')
        self.report_mid = _create_report(months_ago=4, region='egypt')
        self.report_old = _create_report(months_ago=8, region='england')

    def _assert_full_access(self, user: User):
        """Shared assertion: user sees all 3 reports, all with full access."""
        client = APIClient()
        client.force_authenticate(user=user)
        response: Any = client.get(REPORTS_LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

        for report_data in response.data:
            self.assertTrue(
                report_data['can_view'],
                f"can_view should be True for {report_data['title']}",
            )
            self.assertTrue(
                report_data['can_download'],
                f"can_download should be True for {report_data['title']}",
            )

    def test_data_analyst_has_full_access(self):
        """DATA_ANALYST role sees all reports with full view+download."""
        analyst = _create_user('analyst@smartmove.test', role='DATA_ANALYST')
        self._assert_full_access(analyst)

    def test_admin_has_full_access(self):
        """ADMIN role sees all reports with full view+download."""
        admin = _create_user('admin@smartmove.test', role='ADMIN')
        self._assert_full_access(admin)


# ═════════════════════════════════════════════════════════════════════════════
# 3. Regular User — Tiered Paywall
# ═════════════════════════════════════════════════════════════════════════════

class TestRegularUserTieredAccess(APITestCase):
    """
    A user with role='USER' gets age-restricted access:

        0-2 months  → can_view=True, can_download=True
        2-6 months  → can_view=True, can_download=False
        6+  months  → excluded from the queryset entirely
    """

    def setUp(self):
        """Create three reports at different paywall tiers."""
        self.user = _create_user('user@smartmove.test', role='USER')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Tier 1: Fresh report (1 month old) — full access
        self.report_1mo = _create_report(months_ago=1, region='dubai')

        # Tier 2: Mid-age report (4 months old) — view only
        self.report_4mo = _create_report(months_ago=4, region='egypt')

        # Tier 3: Old report (7 months old) — excluded
        self.report_7mo = _create_report(months_ago=7, region='england')

    def test_regular_user_tiered_access(self):
        """
        Regular USER sees all reports < 6 months old and >= 6 months old.
        The 7-month report is included but with 403 flags.
        """
        response: Any = self.client.get(REPORTS_LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # All 3 reports should be returned
        self.assertEqual(len(response.data), 3)

        returned_ids = {r['id'] for r in response.data}
        self.assertIn(self.report_1mo.pk, returned_ids)
        self.assertIn(self.report_4mo.pk, returned_ids)
        self.assertIn(self.report_7mo.pk, returned_ids)

        # Check ReportActivityLog was populated
        logs = ReportActivityLog.objects.filter(user=self.user)
        self.assertEqual(logs.count(), 3)
        self.assertTrue(all(log.action == 'VIEW' for log in logs))

    def test_fresh_report_full_access(self):
        """1-month-old report: can_view=True, can_download=True."""
        response: Any = self.client.get(REPORTS_LIST_URL)

        report_data = next(r for r in response.data if r['id'] == self.report_1mo.pk)
        self.assertTrue(report_data['can_view'])
        self.assertTrue(report_data['can_download'])

    def test_mid_age_report_view_only(self):
        """4-month-old report: can_view=True, can_download=False."""
        response: Any = self.client.get(REPORTS_LIST_URL)

        report_data = next(r for r in response.data if r['id'] == self.report_4mo.pk)
        self.assertTrue(report_data['can_view'])
        self.assertFalse(report_data['can_download'])

    def test_old_report_returns_false_flags(self):
        """7-month-old report appears in the response but with False flags."""
        response: Any = self.client.get(REPORTS_LIST_URL)

        report_data = next(r for r in response.data if r['id'] == self.report_7mo.pk)
        self.assertEqual(report_data['can_view'], False)
        self.assertEqual(report_data['can_download'], False)

    def test_only_old_reports_returns_list_with_false_flags(self):
        """
        When ALL reports are 6+ months old, the regular user receives
        the list of reports with False flags, no global 403.
        """
        # Delete the two visible reports so only the 7mo remains
        self.report_1mo.delete()
        self.report_4mo.delete()

        response: Any = self.client.get(REPORTS_LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['can_view'], False)

    def test_unpublished_reports_hidden(self):
        """Reports with is_published=False are invisible to all users."""
        self.report_1mo.is_published = False  # type: ignore[assignment]
        self.report_1mo.save()

        response: Any = self.client.get(REPORTS_LIST_URL)

        returned_ids = {r['id'] for r in response.data}
        self.assertNotIn(self.report_1mo.pk, returned_ids)
        # Both the 4mo and 7mo reports remain visible (7mo has 403 paywall flags)
        self.assertEqual(len(response.data), 2)


# ═════════════════════════════════════════════════════════════════════════════
# 4. M2M Webhook — Build PDF Endpoint
# ═════════════════════════════════════════════════════════════════════════════

@override_settings(AIRFLOW_WEBHOOK_SECRET=TEST_AIRFLOW_SECRET)
class TestBuildPdfWebhook(APITestCase):
    """
    POST /api/reports/build-pdf/ — Machine-to-machine Airflow webhook.

    Tests cover:
        - Invalid/missing API key → 403
        - Valid key + payload → 201, DB record created
        - WeasyPrint is mocked (not available in CI/test environments)
    """

    def setUp(self):
        self.client = APIClient()
        self.valid_payload = {
            'region': 'dubai',
            'report_month': 5,
            'report_year': 2026,
            'html_content': '<html><body><h1>Test Report</h1></body></html>',
            'azure_container': 'custom-container',
        }

    # ── Auth failures ─────────────────────────────────────────────────────

    def test_missing_api_key_returns_403(self):
        """POST without X-Airflow-API-Key header → 403 Forbidden."""
        response: Any = self.client.post(
            BUILD_PDF_URL,
            data=self.valid_payload,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_api_key_returns_403(self):
        """POST with a wrong X-Airflow-API-Key header → 403 Forbidden."""
        response: Any = self.client.post(
            BUILD_PDF_URL,
            data=self.valid_payload,
            format='json',
            HTTP_X_AIRFLOW_API_KEY='wrong-secret-value',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_empty_api_key_returns_403(self):
        """POST with an empty X-Airflow-API-Key header → 403 Forbidden."""
        response: Any = self.client.post(
            BUILD_PDF_URL,
            data=self.valid_payload,
            format='json',
            HTTP_X_AIRFLOW_API_KEY='',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Successful build ──────────────────────────────────────────────────

    @patch('apps.reports.views.html_to_pdf')
    def test_valid_request_creates_report(self, mock_pdf):
        """
        POST with correct secret + valid payload → 201 Created.

        WeasyPrint is mocked because system-level dependencies
        (libpango, libcairo) may not be available in CI/test environments.
        """
        mock_pdf.return_value = b'%PDF-1.4 fake pdf content for testing'
        
        with patch('apps.reports.views.upload_to_azure') as mock_upload:
            mock_upload.return_value = "https://fakeurl.com/blob.pdf"
            
            response: Any = self.client.post(
                BUILD_PDF_URL,
                data=self.valid_payload,
                format='json',
                HTTP_X_AIRFLOW_API_KEY=TEST_AIRFLOW_SECRET,
            )

            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data['status'], 'created')
            
            # Verify upload_to_azure was called with the container
            mock_upload.assert_called_once_with(
                mock_pdf.return_value,
                "reports/dubai/2026/05_executive_summary.pdf",
                container='custom-container',
            )
        self.assertIn('report_id', response.data)
        self.assertIn('azure_blob_url', response.data)
        self.assertIn('Dubai', response.data['title'])

        # Verify the database record was created
        report = Report.objects.get(pk=response.data['report_id'])  # type: ignore[attr-defined]
        self.assertEqual(report.region, 'dubai')
        self.assertEqual(report.report_month, 5)
        self.assertEqual(report.report_year, 2026)
        self.assertEqual(report.file_size_bytes, len(mock_pdf.return_value))
        self.assertTrue(report.is_published)

        # Verify WeasyPrint was called with the HTML content
        mock_pdf.assert_called_once_with(self.valid_payload['html_content'])

    @patch('apps.reports.views.html_to_pdf')
    def test_duplicate_request_updates_existing(self, mock_pdf):
        """
        Sending the same region+month+year twice should update (not duplicate)
        the existing report, thanks to update_or_create.
        """
        mock_pdf.return_value = b'%PDF-1.4 first version'
        
        with patch('apps.reports.views.upload_to_azure') as mock_upload:
            mock_upload.return_value = "https://fakeurl.com/blob1.pdf"
            
            # First request → creates
            resp1: Any = self.client.post(
                BUILD_PDF_URL,
                data=self.valid_payload,
                format='json',
                HTTP_X_AIRFLOW_API_KEY=TEST_AIRFLOW_SECRET,
            )
            self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
            self.assertEqual(resp1.data['status'], 'created')

            # Second request → updates
            mock_pdf.return_value = b'%PDF-1.4 second version longer'
            mock_upload.return_value = "https://fakeurl.com/blob2.pdf"
            
            resp2: Any = self.client.post(
                BUILD_PDF_URL,
                data=self.valid_payload,
                format='json',
                HTTP_X_AIRFLOW_API_KEY=TEST_AIRFLOW_SECRET,
            )
            self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
            self.assertEqual(resp2.data['status'], 'updated')

        # Only one report in the DB for this region+month+year
        count = Report.objects.filter(  # type: ignore[attr-defined]
            region='dubai', report_month=5, report_year=2026,
        ).count()
        self.assertEqual(count, 1)

        # File size should match the second (longer) PDF
        report = Report.objects.get(  # type: ignore[attr-defined]
            region='dubai', report_month=5, report_year=2026,
        )
        self.assertEqual(report.file_size_bytes, len(b'%PDF-1.4 second version longer'))

    # ── Validation failures ───────────────────────────────────────────────

    @patch('apps.reports.views.html_to_pdf')
    def test_invalid_region_returns_400(self, mock_pdf):
        """POST with an invalid region → 400 Bad Request."""
        payload = {**self.valid_payload, 'region': 'mars'}

        response: Any = self.client.post(
            BUILD_PDF_URL,
            data=payload,
            format='json',
            HTTP_X_AIRFLOW_API_KEY=TEST_AIRFLOW_SECRET,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_pdf.assert_not_called()

    @patch('apps.reports.views.html_to_pdf')
    def test_missing_html_content_returns_400(self, mock_pdf):
        """POST without html_content → 400 Bad Request."""
        payload = {
            'region': 'dubai',
            'report_month': 5,
            'report_year': 2026,
            # html_content intentionally omitted
        }

        response: Any = self.client.post(
            BUILD_PDF_URL,
            data=payload,
            format='json',
            HTTP_X_AIRFLOW_API_KEY=TEST_AIRFLOW_SECRET,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_pdf.assert_not_called()

    @patch('apps.reports.views.html_to_pdf')
    def test_invalid_month_returns_400(self, mock_pdf):
        """POST with report_month=13 → 400 Bad Request."""
        payload = {**self.valid_payload, 'report_month': 13}

        response: Any = self.client.post(
            BUILD_PDF_URL,
            data=payload,
            format='json',
            HTTP_X_AIRFLOW_API_KEY=TEST_AIRFLOW_SECRET,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        mock_pdf.assert_not_called()


# ═════════════════════════════════════════════════════════════════════════════
# 5. Edge Case — Empty AIRFLOW_WEBHOOK_SECRET (Fail Closed)
# ═════════════════════════════════════════════════════════════════════════════

@override_settings(AIRFLOW_WEBHOOK_SECRET='')
class TestWebhookFailsClosed(APITestCase):
    """
    When AIRFLOW_WEBHOOK_SECRET is empty, the HasAirflowSecret permission
    must fail closed — deny ALL requests, even if a key is provided.
    """

    def test_empty_secret_denies_all(self):
        """
        If the server-side secret is empty, even a matching empty key
        should not grant access. The permission must fail closed.
        """
        client = APIClient()
        payload = {
            'region': 'dubai',
            'report_month': 5,
            'report_year': 2026,
            'html_content': '<html><body>test</body></html>',
        }

        response: Any = client.post(
            BUILD_PDF_URL,
            data=payload,
            format='json',
            HTTP_X_AIRFLOW_API_KEY='any-key',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ═════════════════════════════════════════════════════════════════════════════
# 6. Model Unit Tests
# ═════════════════════════════════════════════════════════════════════════════

class TestReportModel(TestCase):
    """Unit tests for the Report model's properties and constraints."""

    def test_age_months_current_month(self):
        """A report for the current month should have age_months == 0."""
        now = timezone.now()
        report = _create_report(months_ago=0)
        self.assertEqual(report.age_months, 0)

    def test_age_months_past_report(self):
        """A report from 3 months ago should have age_months == 3."""
        report = _create_report(months_ago=3, region='egypt')
        self.assertEqual(report.age_months, 3)

    def test_str_representation(self):
        """__str__ should return 'Region — MM/YYYY' format."""
        report = _create_report(
            region='dubai',
            report_month=5,
            report_year=2026,
            title='Test',
            months_ago=0,
        )
        # Override to known values since _create_report uses months_ago
        report.report_month = 5  # type: ignore[assignment]
        report.report_year = 2026  # type: ignore[assignment]
        report.save()
        self.assertEqual(str(report), 'Dubai — 05/2026')

    def test_unique_constraint(self):
        """Creating two reports for the same region+month+year should raise."""
        from django.db import IntegrityError

        _create_report(region='dubai', months_ago=0)
        with self.assertRaises(IntegrityError):
            # Force same month/year by using identical months_ago
            month, year = _month_offset(0)
            Report.objects.create(  # type: ignore[attr-defined]
                region='dubai',
                report_month=month,
                report_year=year,
                title='Duplicate',
                azure_blob_url='https://example.com/dup.pdf',
            )
