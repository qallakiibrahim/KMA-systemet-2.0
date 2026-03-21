from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class LoginView(APIView):
    def post(self, request):
        return Response({"message": "Login successful"}, status=status.HTTP_200_OK)

class RegisterView(APIView):
    def post(self, request):
        return Response({"message": "Registration successful"}, status=status.HTTP_201_CREATED)
