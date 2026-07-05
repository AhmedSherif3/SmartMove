# Generated manually to match: python manage.py makemigrations upload --name dataimport_add_run_id

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('upload', '0003_remove_dataimport_celery_task_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='dataimport',
            name='run_id',
            field=models.CharField(
                blank=True,
                help_text='Airflow DAG run_id used to correlate pipeline executions with uploads.',
                max_length=255,
                null=True,
                unique=True,
            ),
        ),
    ]
