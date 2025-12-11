import json
import requests
import os
import base64
import hashlib
import hmac
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def delete_ghost_page(page_id: str) -> str:
    """
    Deletes a page from Ghost blog.

    This function supports two usage scenarios:
      1) Deleting a page
      2) Retrieving the tool's metadata by passing page_id="__tool_info__"

    Args:
        page_id (str): The ID of the page to delete

    Returns:
        str: JSON-formatted string containing the response
    """
    if page_id == "__tool_info__":
        info = {
            "name": "delete_ghost_page",
            "description": "Deletes a page from Ghost blog",
            "args": {
                "page_id": {
                    "type": "string",
                    "description": "The ID of the page to delete",
                    "required": True
                }
            }
        }
        return json.dumps(info)

    if not page_id:
        return json.dumps({"error": "Page ID is required"})

    api_url = os.environ.get("GHOST_API_URL", "http://192.168.50.80:8083").rstrip("/")
    admin_id = "67b2d2824fdabf0001eb99ea"
    admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"

    try:
        # Create JWT token manually
        header = {
            "alg": "HS256",
            "typ": "JWT",
            "kid": admin_id
        }
        iat = int(time.time())
        payload = {
            "iat": iat,
            "exp": iat + 300,  # Token expires in 5 minutes
            "aud": "/admin/"
        }

        # Base64 encode header and payload
        header_encoded = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode('utf-8')
        payload_encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode('utf-8')
        
        # Create signature
        message = f"{header_encoded}.{payload_encoded}"
        key = bytes.fromhex(admin_secret)
        signature = hmac.new(key, message.encode(), hashlib.sha256).digest()
        signature_encoded = base64.urlsafe_b64encode(signature).rstrip(b'=').decode('utf-8')
        
        # Combine into final token
        token = f"{header_encoded}.{payload_encoded}.{signature_encoded}"

        session = requests.Session()
        adapter = HTTPAdapter(max_retries=Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        ))
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        headers = {
            "Authorization": f"Ghost {token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        # Ghost Admin API endpoint
        url = f"{api_url}/ghost/api/admin/pages/{page_id}"

        print(f"Making request to: {url}")
        print(f"Headers: {headers}")

        response = session.delete(
            url,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        
        # Ghost returns 204 No Content for successful deletion
        if response.status_code == 204:
            return json.dumps({"success": True, "message": f"Page {page_id} deleted successfully"})
        return json.dumps(response.json())
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            error_msg += f"\nResponse: {e.response.text}"
        return json.dumps({"error": f"Network or HTTP error - {error_msg}"})
    except Exception as e:
        return json.dumps({"error": f"Unexpected error - {str(e)}"})
    finally:
        session.close()

if __name__ == "__main__":
    print("Testing delete_ghost_page tool...")
    
    # Example page deletion
    print("\nDeleting page...")
    try:
        # Get the About page
        api_url = os.environ.get("GHOST_API_URL", "http://192.168.50.80:8083").rstrip("/")
        list_url = f"{api_url}/ghost/api/admin/pages/"
        
        # Create JWT for listing request
        iat = int(time.time())
        header = {"alg": "HS256", "typ": "JWT", "kid": "67b2d2824fdabf0001eb99ea"}
        payload = {"iat": iat, "exp": iat + 300, "aud": "/admin/"}
        header_encoded = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode('utf-8')
        payload_encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode('utf-8')
        message = f"{header_encoded}.{payload_encoded}"
        key = bytes.fromhex("100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d")
        signature = hmac.new(key, message.encode(), hashlib.sha256).digest()
        signature_encoded = base64.urlsafe_b64encode(signature).rstrip(b'=').decode('utf-8')
        list_token = f"{header_encoded}.{payload_encoded}.{signature_encoded}"

        list_headers = {
            "Authorization": f"Ghost {list_token}",
            "Accept": "application/json"
        }

        pages = requests.get(
            list_url,
            params={"filter": "slug:about"},
            headers=list_headers
        )
        print(f"List pages response status: {pages.status_code}")
        pages_json = pages.json()
        print(f"List pages response: {pages_json}")

        if pages_json and len(pages_json.get("pages", [])) > 0:
            page_id = pages_json["pages"][0]["id"]
            print(f"Deleting page with ID: {page_id}")
            result = delete_ghost_page(page_id)
            response = json.loads(result)
            if "error" in response:
                print(f"Error deleting page: {response['error']}")
            else:
                print("Page deleted successfully!")
                print(json.dumps(response, indent=2))
        else:
            print("About page not found")
    except Exception as e:
        print(f"Error during test: {str(e)}")