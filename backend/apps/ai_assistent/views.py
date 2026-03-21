from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import os
from google.genai import GoogleGenAI

class AIAssistantView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt')
        if not prompt:
            return Response({'error': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            return Response({'error': 'Gemini API key not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            ai = GoogleGenAI(api_key=api_key)
            response = ai.models.generate_content(
                model='gemini-3-flash-preview',
                contents=prompt
            )
            return Response({'response': response.text})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
