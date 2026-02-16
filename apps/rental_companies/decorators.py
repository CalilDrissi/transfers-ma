from functools import wraps
from django.shortcuts import redirect, render
from django.contrib.auth.decorators import login_required


def rental_company_required(view_func):
    """Decorator that checks the user is a rental company with approved status."""

    @wraps(view_func)
    @login_required(login_url='/portal/login/')
    def wrapper(request, *args, **kwargs):
        if request.user.role != 'rental_company':
            return redirect('/portal/login/')

        try:
            company = request.user.rental_company
        except Exception:
            return redirect('/portal/login/')

        if company.status == 'pending':
            return render(request, 'portal/status_pending.html', {'company': company})
        if company.status == 'suspended':
            return render(request, 'portal/status_suspended.html', {'company': company})
        if company.status == 'rejected':
            return render(request, 'portal/status_rejected.html', {'company': company})

        request.company = company
        return view_func(request, *args, **kwargs)

    return wrapper
