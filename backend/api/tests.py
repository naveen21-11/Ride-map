from django.test import TestCase

from .models import User


class AdminRoleTests(TestCase):
    def test_admin_roles_are_recognized(self):
        for role in ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']:
            user = User.objects.create_user(username=f'{role.lower()}user', password='secret123')
            user.role = role
            user.save(update_fields=['role'])
            self.assertTrue(user.is_admin_user)

    def test_regular_users_are_not_admins(self):
        user = User.objects.create_user(username='regularuser', password='secret123')
        user.role = 'USER'
        user.save(update_fields=['role'])
        self.assertFalse(user.is_admin_user)


class AuthTests(TestCase):
    def test_register_user_success(self):
        data = {
            'username': 'newrider',
            'email': 'newrider@example.com',
            'password': 'StrongPassword123!',
            'password2': 'StrongPassword123!',
            'first_name': 'New',
            'last_name': 'Rider',
            'home_city': 'Bengaluru',
            'country': 'India',
        }
        response = self.client.post('/api/auth/register/', data, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'newrider')

    def test_login_by_username_and_email(self):
        User.objects.create_user(username='riderone', email='riderone@example.com', password='Password123!')
        
        # Test login via username
        res1 = self.client.post('/api/auth/login/', {'username': 'riderone', 'password': 'Password123!'}, content_type='application/json')
        self.assertEqual(res1.status_code, 200)
        self.assertIn('access', res1.data)

        # Test login via email
        res2 = self.client.post('/api/auth/login/', {'username': 'riderone@example.com', 'password': 'Password123!'}, content_type='application/json')
        self.assertEqual(res2.status_code, 200)
        self.assertIn('access', res2.data)

    def test_duplicate_username_and_email_validation(self):
        User.objects.create_user(username='existingrider', email='existing@example.com', password='Password123!')
        
        # Duplicate username test
        data1 = {'username': 'ExistingRider', 'email': 'other@example.com', 'password': 'Password123!', 'password2': 'Password123!'}
        res1 = self.client.post('/api/auth/register/', data1, content_type='application/json')
        self.assertEqual(res1.status_code, 400)
        self.assertIn('username', res1.data)

        # Duplicate email test
        data2 = {'username': 'otherrider', 'email': 'EXISTING@example.com', 'password': 'Password123!', 'password2': 'Password123!'}
        res2 = self.client.post('/api/auth/register/', data2, content_type='application/json')
        self.assertEqual(res2.status_code, 400)
        self.assertIn('email', res2.data)

