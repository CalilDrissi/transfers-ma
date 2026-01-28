from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Profile, DriverProfile


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'


class DriverProfileInline(admin.StackedInline):
    model = DriverProfile
    can_delete = False
    verbose_name_plural = 'Driver Profile'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'role', 'is_active', 'is_verified', 'created_at')
    list_filter = ('role', 'is_active', 'is_verified', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'phone')
    ordering = ('-created_at',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'phone', 'avatar')}),
        (_('Role & Status'), {'fields': ('role', 'is_verified', 'language')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'role'),
        }),
    )

    inlines = [ProfileInline]


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'city', 'country', 'created_at')
    search_fields = ('user__email', 'city', 'country')
    raw_id_fields = ('user',)


@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'license_number', 'license_expiry', 'is_available', 'rating', 'total_trips')
    list_filter = ('is_available',)
    search_fields = ('user__email', 'license_number')
    raw_id_fields = ('user', 'vehicle')
