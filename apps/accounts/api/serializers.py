from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from apps.accounts.models import Profile, DriverProfile

User = get_user_model()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['address', 'city', 'country', 'postal_code', 'date_of_birth', 'notes']


class DriverProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverProfile
        fields = ['license_number', 'license_expiry', 'is_available', 'rating', 'total_trips']
        read_only_fields = ['rating', 'total_trips']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'avatar', 'is_verified', 'language',
            'profile', 'created_at'
        ]
        read_only_fields = ['id', 'email', 'role', 'is_verified', 'created_at']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'phone',
            'password', 'password_confirm', 'language'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Passwords do not match.'
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Passwords do not match.'
            })
        return attrs


class UserAdminSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)
    driver_profile = DriverProfileSerializer(required=False, read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'avatar', 'is_active', 'is_verified', 'language',
            'profile', 'driver_profile', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data and hasattr(instance, 'profile'):
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)
            instance.profile.save()

        return instance
