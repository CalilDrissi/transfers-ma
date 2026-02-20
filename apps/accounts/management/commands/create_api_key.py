from django.core.management.base import BaseCommand

from apps.accounts.api_keys import APIKey
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Generate a new API key for an external consumer (e.g. WordPress plugin).'

    def add_arguments(self, parser):
        parser.add_argument('name', type=str, help='Descriptive name, e.g. "WordPress Plugin"')
        parser.add_argument('--owner', type=str, help='Owner email (defaults to first superuser)')
        parser.add_argument('--tier', type=str, default='standard', choices=['free', 'standard', 'premium'])

    def handle(self, *args, **options):
        owner_email = options.get('owner')
        if owner_email:
            try:
                owner = User.objects.get(email=owner_email)
            except User.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'User with email "{owner_email}" not found.'))
                return
        else:
            owner = User.objects.filter(is_superuser=True).first()
            if not owner:
                self.stderr.write(self.style.ERROR('No superuser found. Pass --owner email.'))
                return

        raw_key, hashed_key, prefix = APIKey.generate_key()

        APIKey.objects.create(
            name=options['name'],
            key=hashed_key,
            prefix=prefix,
            owner=owner,
            tier=options['tier'],
        )

        self.stdout.write(self.style.SUCCESS(f'API key created for "{options["name"]}" (owner: {owner.email})'))
        self.stdout.write('')
        self.stdout.write(self.style.WARNING(f'  Raw key: {raw_key}'))
        self.stdout.write('')
        self.stdout.write('Copy this key now — it cannot be retrieved later.')
        self.stdout.write('Paste it into WordPress → Transfers → API Key setting.')
