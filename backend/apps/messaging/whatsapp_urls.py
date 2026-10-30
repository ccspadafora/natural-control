from django.urls import path

from apps.messaging.whatsapp_api import WhatsappConversationListView

urlpatterns = [
    path("whatsapp/conversations", WhatsappConversationListView.as_view()),
]
