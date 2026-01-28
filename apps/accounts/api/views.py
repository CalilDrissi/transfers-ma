from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    ChangePasswordSerializer,
    UserAdminSerializer,
    ProfileSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user."""
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update the current user's profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UpdateProfileView(generics.UpdateAPIView):
    """Update user profile details."""
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.profile


class ChangePasswordView(APIView):
    """Change user password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Wrong password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({'message': 'Password changed successfully.'})


class LogoutView(APIView):
    """Logout and blacklist the refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response(
                {'error': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


# Admin Views
class UserListView(generics.ListCreateAPIView):
    """List all users or create a new user (admin only)."""
    queryset = User.objects.all()
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ['role', 'is_active', 'is_verified']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['created_at', 'email', 'first_name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserAdminSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a user (admin only)."""
    queryset = User.objects.all()
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAdminUser]
