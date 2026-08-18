from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('USER', 'User'),
        ('MODERATOR', 'Moderator'),
        ('ADMIN', 'Admin'),
        ('SUPER_ADMIN', 'Super Admin'),
    ]
    bio = models.TextField(blank=True, default='')
    home_city = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='India')
    total_distance_km = models.FloatField(default=0.0)
    avatar = models.URLField(blank=True, default='')
    background_image = models.TextField(blank=True, default='')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='USER', db_index=True)
    is_verified = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['email']),
        ]

    @property
    def is_admin_user(self):
        return self.role in {'ADMIN', 'SUPER_ADMIN', 'MODERATOR'}

    def __str__(self):
        return self.username


class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following', db_index=True)
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('follower', 'following')


class LocationPin(models.Model):
    PIN_TYPES = [
        ('VISITED', 'Visited'),
        ('FAVORITE', 'Favorite'),
        ('BUCKET_LIST', 'Bucket List'),
    ]

    rider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='location_pins', db_index=True)
    name = models.CharField(max_length=255)
    pin_type = models.CharField(max_length=20, choices=PIN_TYPES, default='BUCKET_LIST', db_index=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    state = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='India')
    visited_date = models.DateField(null=True, blank=True, db_index=True)
    notes = models.TextField(blank=True, default='')
    distance_km = models.FloatField(null=True, blank=True)
    weather = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.pin_type})'


class GroupRide(models.Model):
    title = models.CharField(max_length=255)
    invite_code = models.CharField(max_length=20, unique=True, db_index=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rides', db_index=True)
    description = models.TextField(blank=True, default='')
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(null=True, blank=True, db_index=True)
    route_coordinates = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f'{self.title} ({self.invite_code})'


class GroupRideMember(models.Model):
    group_ride = models.ForeignKey(GroupRide, on_delete=models.CASCADE, related_name='members', db_index=True)
    rider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='joined_rides', db_index=True)
    joined_at = models.DateTimeField(auto_now_add=True, db_index=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)
    speed_kmh = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ('group_ride', 'rider')


class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages', db_index=True)
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='received_messages', db_index=True
    )
    group_ride = models.ForeignKey(
        GroupRide, on_delete=models.CASCADE, null=True, blank=True, related_name='messages', db_index=True
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.sender.username}: {self.content[:50]}'


class Motorcycle(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='motorcycles', db_index=True)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField(default=2024)
    engine_cc = models.IntegerField(default=400)
    fuel_efficiency_kmpl = models.FloatField(default=25.0)
    color = models.CharField(max_length=50, blank=True, default='')
    is_primary = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f'{self.make} {self.model}'


class Expense(models.Model):
    CATEGORIES = [
        ('FUEL', 'Fuel'),
        ('STAY', 'Stay'),
        ('FOOD', 'Food'),
        ('MAINTENANCE', 'Maintenance'),
        ('OTHER', 'Other'),
    ]

    rider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses', db_index=True)
    motorcycle = models.ForeignKey(
        Motorcycle, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses', db_index=True
    )
    category = models.CharField(max_length=20, choices=CATEGORIES, default='FUEL', db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255, blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    date = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f'{self.category}: ₹{self.amount}'
