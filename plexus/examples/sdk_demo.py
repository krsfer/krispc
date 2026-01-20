import requests
import json
import os

class PlexusClient:
    """
    A simple Python client for the Plexus API.
    Demonstrates "Pattern 4: Your System Can Be Infrastructure".
    """
    
    def __init__(self, base_url, api_token=None):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        if api_token:
            self.session.headers.update({"Authorization": f"Token {api_token}"})
        
        # In a real scenario, you'd handle auth (e.g. login to get token)
        # For this demo, we assume the user might provide a token or use session cookies.

    def get_actions(self, status="pending"):
        """Fetch actions filtered by status."""
        endpoint = f"{self.base_url}/api/v1/actions/"
        params = {"search": status}
        response = self.session.get(endpoint, params=params)
        response.raise_for_status()
        return response.json()

    def generate_custom_view(self, query):
        """Use the AI-Generated Interface endpoint."""
        endpoint = f"{self.base_url}/api/v1/generate-view/"
        payload = {"query": query}
        response = self.session.post(endpoint, json=payload)
        response.raise_for_status()
        return response.json()

def main():
    # Configuration (Defaults to local dev server)
    BASE_URL = os.environ.get("PLEXUS_URL", "http://127.0.0.1:8000")
    # To run this against a protected API, get a token from /admin/ or implement login
    TOKEN = os.environ.get("PLEXUS_TOKEN", "") 

    client = PlexusClient(BASE_URL, TOKEN)
    
    print(f"--- Connecting to Plexus at {BASE_URL} ---")

    try:
        # Demo 1: Standard API Call
        print("\n[1] Fetching Pending Actions...")
        actions = client.get_actions("pending")
        # DRF returns paginated results usually in 'results', or list if not paginated
        results = actions.get('results', actions) 
        
        print(f"Found {len(results)} actions.")
        for action in results[:3]:
            print(f" - [ ] {action['description']}")

        # Demo 2: AI-Generated View (Experimental)
        print("\n[2] Requesting AI-Generated View for 'Urgent work tasks'...")
        view = client.generate_custom_view("Show me urgent tasks related to work")
        
        meta = view.get('meta', {})
        print(f"\nTitle: {meta.get('title')}")
        print(f"Layout: {meta.get('layout')}")
        print(f"Description: {meta.get('description')}")
        
        data = view.get('data', [])
        print(f"Data Items: {len(data)}")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to Plexus. Is the server running?")
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if e.response.status_code == 403:
            print("Tip: Set PLEXUS_TOKEN env var to authenticate.")

if __name__ == "__main__":
    main()
