from rest_framework.views import exception_handler
from rest_framework import status


def custom_exception_handler(exc, context):
    """Standardized error response format for the API."""
    response = exception_handler(exc, context)

    if response is None:
        return response

    error_code = 'error'
    if response.status_code == status.HTTP_400_BAD_REQUEST:
        error_code = 'validation_error'
    elif response.status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = 'authentication_error'
    elif response.status_code == status.HTTP_403_FORBIDDEN:
        error_code = 'permission_denied'
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        error_code = 'not_found'
    elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        error_code = 'rate_limit_exceeded'
    elif response.status_code >= 500:
        error_code = 'server_error'

    # Build details from DRF's default error data
    details = []
    if isinstance(response.data, dict):
        for field, errors in response.data.items():
            if isinstance(errors, list):
                for err in errors:
                    details.append({'field': field, 'message': str(err)})
            else:
                details.append({'field': field, 'message': str(errors)})
    elif isinstance(response.data, list):
        for err in response.data:
            details.append({'message': str(err)})

    message = details[0]['message'] if details else 'An error occurred.'

    response.data = {
        'error': {
            'code': error_code,
            'message': message,
            'details': details,
        }
    }

    return response
