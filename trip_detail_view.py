@login_required
@user_passes_test(is_admin)
def trip_detail(request, pk):
    """Trip/tour detail and edit view."""
    trip = get_object_or_404(
        Trip.objects.prefetch_related(
            'images', 'highlights', 'itinerary_stops', 'price_tiers',
            'content_blocks', 'faqs', 'related_trips'
        ),
        pk=pk
    )

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'update_trip':
            # Update basic fields
            trip.name = request.POST.get('name', trip.name)
            trip.short_description = request.POST.get('short_description', '')
            trip.description = request.POST.get('description', '')
            trip.trip_type = request.POST.get('trip_type', trip.trip_type)
            trip.service_type = request.POST.get('service_type', trip.service_type)
            trip.departure_location = request.POST.get('departure_location', '')
            trip.destinations = request.POST.get('destinations', '')
            trip.driver_languages = request.POST.get('driver_languages', '')
            trip.duration_hours = request.POST.get('duration_hours') or None
            trip.duration_days = request.POST.get('duration_days') or 1
            trip.min_participants = request.POST.get('min_participants') or 1
            trip.max_participants = request.POST.get('max_participants') or 20
            trip.pricing_model = request.POST.get('pricing_model', trip.pricing_model)
            trip.price_per_person = request.POST.get('price_per_person') or None
            trip.child_price = request.POST.get('child_price') or None
            trip.private_tour_price = request.POST.get('private_tour_price') or None
            trip.currency = request.POST.get('currency', 'MAD')
            trip.inclusions = request.POST.get('inclusions', '')
            trip.exclusions = request.POST.get('exclusions', '')
            trip.cancellation_policy = request.POST.get('cancellation_policy', trip.cancellation_policy)
            trip.booking_notice_hours = request.POST.get('booking_notice_hours') or 24
            trip.instant_confirmation = request.POST.get('instant_confirmation') == 'on'
            trip.child_policy = request.POST.get('child_policy', '')
            trip.accessibility_info = request.POST.get('accessibility_info', '')
            trip.meta_title = request.POST.get('meta_title', '')
            trip.meta_description = request.POST.get('meta_description', '')
            trip.meta_keywords = request.POST.get('meta_keywords', '')
            trip.status = request.POST.get('status', trip.status)
            trip.is_active = trip.status == 'published'
            trip.is_featured = request.POST.get('is_featured') == 'on'
            trip.order = request.POST.get('order') or 0

            if request.FILES.get('featured_image'):
                trip.featured_image = request.FILES['featured_image']

            trip.save()

            # Handle gallery: delete checked images
            for img in trip.images.all():
                if request.POST.get(f'delete_image_{img.id}'):
                    img.image.delete(save=False)
                    img.delete()

            # Handle gallery: add new images
            new_images = request.FILES.getlist('gallery_images')
            existing_count = trip.images.count()
            for idx, img_file in enumerate(new_images):
                TripImage.objects.create(
                    trip=trip,
                    image=img_file,
                    order=existing_count + idx
                )

            # Handle highlights: clear and re-create
            trip.highlights.all().delete()
            highlight_texts = request.POST.getlist('highlight_text[]')
            highlight_icons = request.POST.getlist('highlight_icon[]')
            for idx, text in enumerate(highlight_texts):
                if text.strip():
                    icon = highlight_icons[idx] if idx < len(highlight_icons) else 'bi-check-circle'
                    TripHighlight.objects.create(
                        trip=trip, text=text.strip(), icon=icon, order=idx
                    )

            # Handle itinerary stops: clear and re-create
            trip.itinerary_stops.all().delete()
            stop_names = request.POST.getlist('stop_name[]')
            stop_types = request.POST.getlist('stop_type[]')
            stop_locations = request.POST.getlist('stop_location[]')
            stop_descriptions = request.POST.getlist('stop_description[]')
            stop_durations = request.POST.getlist('stop_duration[]')
            for idx, name in enumerate(stop_names):
                if name.strip():
                    TripItineraryStop.objects.create(
                        trip=trip,
                        name=name.strip(),
                        stop_type=stop_types[idx] if idx < len(stop_types) else 'stop',
                        location=stop_locations[idx] if idx < len(stop_locations) else '',
                        description=stop_descriptions[idx] if idx < len(stop_descriptions) else '',
                        duration_minutes=int(stop_durations[idx]) if idx < len(stop_durations) and stop_durations[idx] else None,
                        order=idx
                    )

            # Handle FAQs: clear and re-create
            trip.faqs.all().delete()
            faq_questions = request.POST.getlist('faq_question[]')
            faq_answers = request.POST.getlist('faq_answer[]')
            for idx, question in enumerate(faq_questions):
                if question.strip() and idx < len(faq_answers) and faq_answers[idx].strip():
                    TripFAQ.objects.create(
                        trip=trip,
                        question=question.strip(),
                        answer=faq_answers[idx].strip(),
                        order=idx
                    )

            messages.success(request, 'Tour updated successfully.')

        elif action == 'delete_trip':
            trip_name = trip.name
            trip.delete()
            messages.success(request, f'Tour "{trip_name}" deleted.')
            return redirect('dashboard:trip_list')

        return redirect('dashboard:trip_detail', pk=pk)

    all_trips = Trip.objects.filter(is_active=True).exclude(pk=pk).order_by('name')

    context = {
        'trip': trip,
        'trip_types': Trip.TripType.choices,
        'service_types': Trip.ServiceType.choices,
        'pricing_models': Trip.PricingModel.choices,
        'cancellation_policies': Trip.CancellationPolicy.choices,
        'statuses': Trip.Status.choices,
        'all_trips': all_trips,
    }
    return render(request, 'dashboard/trips/detail.html', context)
