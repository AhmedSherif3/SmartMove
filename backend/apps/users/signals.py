from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import User

@receiver(pre_save, sender=User)
def store_original_user_state(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._original_is_active = old_instance.is_active
            instance._original_role = old_instance.role
        except sender.DoesNotExist:
            pass

@receiver(post_save, sender=User)
def disconnect_user_on_change(sender, instance, created, **kwargs):
    if created:
        return

    old_is_active = getattr(instance, '_original_is_active', instance.is_active)
    old_role = getattr(instance, '_original_role', instance.role)

    # Trigger disconnect if user is deactivated or role has changed
    if (old_is_active and not instance.is_active) or (old_role != instance.role):
        from apps.chatbot.services.pusher_service import get_pusher_client
        pusher = get_pusher_client()
        if pusher:
            pusher.trigger(
                f"private-notifications-{instance.pk}",
                "force_disconnect",
                {}
            )

