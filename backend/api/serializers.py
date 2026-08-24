from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, Follow, LocationPin, GroupRide, GroupRideMember,
    ChatMessage, Motorcycle, Expense, EmailOTP,
)



class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get('username', '').strip()
        password = attrs.get('password')

        if username_or_email and password:
            if '@' in username_or_email:
                try:
                    user_obj = User.objects.get(email__iexact=username_or_email)
                    attrs['username'] = user_obj.username
                except User.DoesNotExist:
                    pass
                except User.MultipleObjectsReturned:
                    user_obj = User.objects.filter(email__iexact=username_or_email).first()
                    if user_obj:
                        attrs['username'] = user_obj.username
            else:
                attrs['username'] = username_or_email

        return super().validate(attrs)


class UserSerializer(serializers.ModelSerializer):
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'bio', 'home_city', 'country', 'total_distance_km', 'avatar', 'background_image', 'metadata',
            'role', 'is_verified', 'is_active', 'last_login_at', 'date_joined',
            'followers_count', 'following_count', 'is_following',
        ]
        read_only_fields = ['id', 'total_distance_km', 'role', 'is_verified', 'is_active', 'last_login_at', 'date_joined']

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'home_city', 'country']

    def validate_username(self, value):
        cleaned = value.strip()
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return cleaned

    def validate_email(self, value):
        if value:
            cleaned = value.strip().lower()
            if User.objects.filter(email__iexact=cleaned).exists():
                raise serializers.ValidationError('A user with this email address already exists.')
            return cleaned
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        user.role = 'USER'
        user.is_verified = False
        user.is_active = True
        user.save(update_fields=['role', 'is_verified', 'is_active'])
        return user


class LocationPinSerializer(serializers.ModelSerializer):
    rider_name = serializers.CharField(source='rider.username', read_only=True)

    class Meta:
        model = LocationPin
        fields = [
            'id', 'rider', 'rider_name', 'name', 'pin_type', 'latitude', 'longitude',
            'state', 'country', 'visited_date', 'notes', 'distance_km', 'weather', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'rider', 'created_at', 'updated_at']


class GroupRideMemberSerializer(serializers.ModelSerializer):
    rider = UserSerializer(read_only=True)
    rider_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = GroupRideMember
        fields = [
            'id', 'rider', 'rider_id', 'latitude', 'longitude',
            'heading', 'speed_kmh', 'last_updated', 'joined_at', 'metadata',
        ]
        read_only_fields = ['id', 'joined_at']


class GroupRideSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    members = GroupRideMemberSerializer(many=True, read_only=True)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = GroupRide
        fields = [
            'id', 'title', 'invite_code', 'creator', 'description',
            'start_date', 'end_date', 'route_coordinates', 'is_active', 'metadata',
            'members', 'member_count', 'created_at',
        ]
        read_only_fields = ['id', 'creator', 'invite_code', 'created_at', 'is_active']

    def get_member_count(self, obj):
        return obj.members.count()


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'recipient', 'group_ride', 'content', 'timestamp', 'metadata']
        read_only_fields = ['id', 'sender', 'timestamp']


class MotorcycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motorcycle
        fields = [
            'id', 'make', 'model', 'year', 'engine_cc',
            'fuel_efficiency_kmpl', 'color', 'is_primary', 'created_at', 'metadata',
        ]
        read_only_fields = ['id', 'created_at']


class ExpenseSerializer(serializers.ModelSerializer):
    motorcycle_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            'id', 'motorcycle', 'motorcycle_name', 'category', 'amount',
            'description', 'location', 'date', 'created_at', 'metadata',
        ]
        read_only_fields = ['id', 'created_at']

    def get_motorcycle_name(self, obj):
        if obj.motorcycle:
            return f'{obj.motorcycle.make} {obj.motorcycle.model}'
        return None


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_otp(self, value):
        return value.strip()

