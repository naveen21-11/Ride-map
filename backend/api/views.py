import random
import string
from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    User, Follow, LocationPin, GroupRide, GroupRideMember,
    ChatMessage, Motorcycle, Expense,
)
from .serializers import (
    UserSerializer, RegisterSerializer, CustomTokenObtainPairSerializer, LocationPinSerializer,
    GroupRideSerializer, GroupRideMemberSerializer,
    ChatMessageSerializer, MotorcycleSerializer, ExpenseSerializer,
)


class AdminDashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if not getattr(request.user, 'is_admin_user', False):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_registrations = User.objects.filter(date_joined__gte=timezone.now() - timezone.timedelta(days=30)).count()
        total_rides = GroupRide.objects.count()
        published_rides = GroupRide.objects.filter(is_active=True).count()
        pending_rides = 0
        rejected_rides = 0
        total_reviews = ChatMessage.objects.count()
        reported_posts = 0
        emergency_requests = 0
        events_created = 0
        blog_posts = 0
        website_visitors = 0

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'new_registrations': new_registrations,
            'total_trips': total_rides,
            'published_trips': published_rides,
            'pending_trips': pending_rides,
            'rejected_trips': rejected_rides,
            'total_reviews': total_reviews,
            'reported_posts': reported_posts,
            'emergency_requests': emergency_requests,
            'events_created': events_created,
            'total_blog_posts': blog_posts,
            'website_visitors': website_visitors,
        })


def generate_invite_code():
    prefix = 'RIDE-'
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    code = prefix + suffix
    while GroupRide.objects.filter(invite_code=code).exists():
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = prefix + suffix
    return code


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = getattr(serializer, 'user', None)
        if user:
            user.last_login_at = timezone.now()
            user.save(update_fields=['last_login_at'])
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
        else:
            access_token = serializer.validated_data.get('access')
            refresh_token = serializer.validated_data.get('refresh')
        return Response({
            'access': access_token,
            'refresh': refresh_token,
        })


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, 'is_admin_user', False):
            return User.objects.all().order_by('-date_joined')
        return User.objects.filter(id=self.request.user.id)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)

    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        user = request.user
        for field in ['bio', 'home_city', 'country', 'first_name', 'last_name', 'avatar', 'background_image']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def search(self, request):
        if not getattr(request.user, 'is_admin_user', False):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        q = request.query_params.get('q', '')
        users = User.objects.filter(username__icontains=q) | User.objects.filter(home_city__icontains=q)
        users = users.distinct()[:20]
        return Response(UserSerializer(users, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, pk=None):
        target = self.get_object()
        if target == request.user:
            return Response({'error': 'Cannot follow yourself.'}, status=status.HTTP_400_BAD_REQUEST)
        Follow.objects.get_or_create(follower=request.user, following=target)
        return Response({'status': 'following'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unfollow(self, request, pk=None):
        target = self.get_object()
        Follow.objects.filter(follower=request.user, following=target).delete()
        return Response({'status': 'unfollowed'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_status(self, request, pk=None):
        if not getattr(request.user, 'is_admin_user', False):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def verify(self, request, pk=None):
        if not getattr(request.user, 'is_admin_user', False):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        user.is_verified = True
        user.save(update_fields=['is_verified'])
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def assign_role(self, request, pk=None):
        if not getattr(request.user, 'is_admin_user', False):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        role = request.data.get('role')
        if role not in dict(User.ROLE_CHOICES):
            return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        user = self.get_object()
        user.role = role
        user.save(update_fields=['role'])
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reset_password(self, request, pk=None):
        if not getattr(request.user, 'is_admin_user', False):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        new_password = User.objects.make_random_password(length=12)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'password': new_password})


class LocationPinViewSet(viewsets.ModelViewSet):
    serializer_class = LocationPinSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = LocationPin.objects.all()
        pin_type = self.request.query_params.get('pin_type')
        rider_id = self.request.query_params.get('rider')
        if pin_type:
            qs = qs.filter(pin_type=pin_type)
        if rider_id:
            qs = qs.filter(rider_id=rider_id)
        elif not self.request.user.is_staff:
            qs = qs.filter(rider=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(rider=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_visited(self, request, pk=None):
        pin = self.get_object()
        pin.pin_type = 'VISITED'
        pin.visited_date = timezone.now().date()
        pin.save()
        return Response(LocationPinSerializer(pin).data)


class GroupRideViewSet(viewsets.ModelViewSet):
    serializer_class = GroupRideSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        member_rides = GroupRideMember.objects.filter(
            rider=self.request.user
        ).values_list('group_ride_id', flat=True)
        return (
            GroupRide.objects.filter(id__in=member_rides)
            | GroupRide.objects.filter(creator=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        ride = serializer.save(
            creator=self.request.user,
            invite_code=generate_invite_code(),
            is_active=True,
        )
        GroupRideMember.objects.create(group_ride=ride, rider=self.request.user)

    @action(detail=False, methods=['post'])
    def join_by_code(self, request):
        code = request.data.get('invite_code', '').upper().strip()
        try:
            ride = GroupRide.objects.get(invite_code=code, is_active=True)
        except GroupRide.DoesNotExist:
            return Response({'error': 'Invalid invite code.'}, status=status.HTTP_404_NOT_FOUND)
        GroupRideMember.objects.get_or_create(group_ride=ride, rider=request.user)
        return Response(GroupRideSerializer(ride).data)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        ride = self.get_object()
        if ride.creator == request.user:
            return Response(
                {'error': 'The rally creator cannot leave the rally. Delete or transfer ownership first.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            membership = GroupRideMember.objects.get(group_ride=ride, rider=request.user)
        except GroupRideMember.DoesNotExist:
            return Response({'error': 'You are not a member of this rally.'}, status=status.HTTP_400_BAD_REQUEST)
        membership.delete()
        ride.refresh_from_db()
        return Response(GroupRideSerializer(ride).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        ride = self.get_object()
        if ride.creator != request.user:
            return Response({'error': 'Only the rally creator can mark the ride as completed.'}, status=status.HTTP_403_FORBIDDEN)
        ride.is_active = False
        ride.save()
        GroupRideMember.objects.filter(group_ride=ride).update(
            latitude=None,
            longitude=None,
            heading=None,
            speed_kmh=None,
        )
        ride.refresh_from_db()
        return Response(GroupRideSerializer(ride).data)

    def destroy(self, request, *args, **kwargs):
        ride = self.get_object()
        if ride.creator != request.user:
            return Response({'error': 'Only the rally creator can delete this ride.'}, status=status.HTTP_403_FORBIDDEN)
        if ride.is_active:
            return Response({'error': 'Only completed rallies can be deleted.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        ride = self.get_object()
        if not ride.is_active:
            return Response({'error': 'This rally has been completed and is no longer tracking location.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            member = GroupRideMember.objects.get(group_ride=ride, rider=request.user)
        except GroupRideMember.DoesNotExist:
            return Response({'error': 'Not a member.'}, status=status.HTTP_403_FORBIDDEN)
        member.latitude = request.data.get('latitude')
        member.longitude = request.data.get('longitude')
        member.heading = request.data.get('heading')
        member.speed_kmh = request.data.get('speed_kmh')
        member.last_updated = timezone.now()
        member.save()
        return Response(GroupRideMemberSerializer(member).data)


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ChatMessage.objects.all()
        recipient = self.request.query_params.get('recipient')
        group_ride = self.request.query_params.get('group_ride')
        if recipient:
            from django.db.models import Q
            qs = qs.filter(
                Q(sender=self.request.user, recipient_id=recipient) |
                Q(sender_id=recipient, recipient=self.request.user)
            )
        if group_ride:
            qs = qs.filter(group_ride_id=group_ride)
        return qs

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    def destroy(self, request, *args, **kwargs):
        message = self.get_object()
        if message.sender != request.user:
            return Response({'error': 'Only the sender can delete this message.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class MotorcycleViewSet(viewsets.ModelViewSet):
    serializer_class = MotorcycleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Motorcycle.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_primary'):
            Motorcycle.objects.filter(owner=self.request.user, is_primary=True).update(is_primary=False)
        serializer.save(owner=self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(rider=self.request.user)

    def perform_create(self, serializer):
        serializer.save(rider=self.request.user)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        expenses = Expense.objects.filter(rider=request.user)
        by_category = {}
        total = 0
        for exp in expenses:
            cat = exp.category
            amt = float(exp.amount)
            by_category[cat] = by_category.get(cat, 0) + amt
            total += amt
        return Response({
            'total': total,
            'by_category': by_category,
            'count': expenses.count(),
        })
