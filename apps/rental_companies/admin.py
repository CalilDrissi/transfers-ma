from django.contrib import admin
from .models import RentalCompany, CompanyDocument, CompanyReview, CompanyPayout, VehicleAvailability


class CompanyDocumentInline(admin.TabularInline):
    model = CompanyDocument
    extra = 0


@admin.register(RentalCompany)
class RentalCompanyAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'city', 'status', 'tier', 'commission_rate', 'total_bookings', 'average_rating', 'created_at']
    list_filter = ['status', 'tier', 'city', 'is_featured']
    search_fields = ['company_name', 'email', 'phone', 'ice_number']
    prepopulated_fields = {'slug': ('company_name',)}
    inlines = [CompanyDocumentInline]


@admin.register(CompanyDocument)
class CompanyDocumentAdmin(admin.ModelAdmin):
    list_display = ['company', 'document_type', 'verification_status', 'uploaded_at']
    list_filter = ['document_type', 'verification_status']


@admin.register(CompanyReview)
class CompanyReviewAdmin(admin.ModelAdmin):
    list_display = ['company', 'customer_name', 'rating', 'is_published', 'created_at']
    list_filter = ['rating', 'is_published']


@admin.register(CompanyPayout)
class CompanyPayoutAdmin(admin.ModelAdmin):
    list_display = ['company', 'period_start', 'period_end', 'gross_amount', 'commission_amount', 'net_amount', 'status']
    list_filter = ['status']


@admin.register(VehicleAvailability)
class VehicleAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'company', 'start_date', 'end_date', 'reason']
    list_filter = ['reason', 'company']
