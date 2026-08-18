from django.contrib import admin
from .models import (
    User, Follow, LocationPin, GroupRide, GroupRideMember,
    ChatMessage, Motorcycle, Expense,
)


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'home_city', 'total_distance_km')
    search_fields = ('username', 'email', 'home_city')


@admin.register(LocationPin)
class LocationPinAdmin(admin.ModelAdmin):
    list_display = ('name', 'rider', 'pin_type', 'state', 'visited_date')
    list_filter = ('pin_type',)


@admin.register(GroupRide)
class GroupRideAdmin(admin.ModelAdmin):
    list_display = ('title', 'invite_code', 'creator', 'start_date', 'is_active')
    search_fields = ('title', 'invite_code')


@admin.register(GroupRideMember)
class GroupRideMemberAdmin(admin.ModelAdmin):
    list_display = ('rider', 'group_ride', 'speed_kmh', 'last_updated')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'group_ride', 'timestamp')


@admin.register(Motorcycle)
class MotorcycleAdmin(admin.ModelAdmin):
    list_display = ('make', 'model', 'owner', 'year', 'is_primary')


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('category', 'amount', 'rider', 'date')
    list_filter = ('category',)


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')
