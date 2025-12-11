import json
import requests
import os
import base64
import hashlib
import hmac
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_token(key_id: str, key_secret: str) -> str:
    """
    Creates a Ghost Admin API JWT token without using PyJWT.
    Uses base64 encoding and HMAC-SHA256 for manual JWT creation.
    """
    header = {
        "alg": "HS256",
        "typ": "JWT",
        "kid": key_id
    }
    iat = int(time.time())
    payload = {
        "iat": iat,
        "exp": iat + 300,  # Token expires in 5 minutes
        "aud": "/admin/"
    }

    def b64encode(obj):
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b'=').decode('utf-8')

    header_encoded = b64encode(header)
    payload_encoded = b64encode(payload)

    message = f"{header_encoded}.{payload_encoded}"
    key = bytes.fromhex(key_secret)
    signature = hmac.new(key, message.encode(), hashlib.sha256).digest()
    signature_encoded = base64.urlsafe_b64encode(signature).rstrip(b'=').decode('utf-8')

    return f"{header_encoded}.{payload_encoded}.{signature_encoded}"

def update_ghost_page(page_id: str, title: str = None, content: str = None, status: str = None, featured: bool = None) -> str:
    """
    Updates an existing page in Ghost blog.

    This function supports two usage scenarios:
      1) Updating a page
      2) Retrieving the tool's metadata by passing page_id="__tool_info__"

    Args:
        page_id (str): The ID of the page to update
        title (str, optional): New title for the page
        content (str, optional): New content/body for the page
        status (str, optional): New status (draft, published, scheduled)
        featured (bool, optional): Whether this is a featured page

    Returns:
        str: JSON-formatted string containing the response
    """
    if page_id == "__tool_info__":
        info = {
            "name": "update_ghost_page",
            "description": "Updates an existing page in Ghost blog",
            "args": {
                "page_id": {
                    "type": "string",
                    "description": "The ID of the page to update",
                    "required": True
                },
                "title": {
                    "type": "string",
                    "description": "New title for the page",
                    "required": False
                },
                "content": {
                    "type": "string",
                    "description": "New content/body for the page",
                    "required": False
                },
                "status": {
                    "type": "string",
                    "description": "New status (draft, published, scheduled)",
                    "required": False
                },
                "featured": {
                    "type": "boolean",
                    "description": "Whether this is a featured page",
                    "required": False
                }
            }
        }
        return json.dumps(info)

    if not page_id:
        return json.dumps({"error": "Page ID is required"})

    api_url = os.environ.get("GHOST_API_URL", "https://blog.emmanuelu.com").rstrip("/")
    admin_id = "67b2d2824fdabf0001eb99ea"
    admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"

    try:
        token = create_token(admin_id, admin_secret)

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

        # First get the current page to get its updated_at timestamp
        get_url = f"{api_url}/ghost/api/admin/pages/{page_id}"
        print(f"Fetching current page from: {get_url}")
        
        get_response = session.get(
            get_url,
            headers=headers,
            timeout=30
        )
        get_response.raise_for_status()
        current_page = get_response.json()
        
        if not current_page.get("pages") or len(current_page["pages"]) == 0:
            return json.dumps({"error": f"Page {page_id} not found"})
            
        updated_at = current_page["pages"][0]["updated_at"]

        # Ghost Admin API endpoint for update
        url = f"{api_url}/ghost/api/admin/pages/{page_id}"

        # Build update payload with only provided fields
        page_data = {"pages": [{"updated_at": updated_at}]}  # Include updated_at for collision detection
        update_fields = {
            "title": title,
            "html": content,
            "status": status,
            "featured": featured
        }
        
        for field, value in update_fields.items():
            if value is not None:
                page_data["pages"][0][field] = value

        print(f"Making update request to: {url}")
        print(f"Headers: {headers}")
        print(f"Payload: {json.dumps(page_data, indent=2)}")

        response = session.put(
            url,
            headers=headers,
            json=page_data,
            timeout=30
        )
        response.raise_for_status()
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
    print("Testing update_ghost_page tool...")
    
    # Example page update
    print("\nUpdating page...")
    try:
        # Get the Contact Us page we created earlier
        api_url = os.environ.get("GHOST_API_URL", "http://192.168.50.80:8083").rstrip("/")
        admin_id = "67b2d2824fdabf0001eb99ea"
        admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"
        token = create_token(admin_id, admin_secret)
        
        pages = requests.get(
            f"{api_url}/ghost/api/admin/pages",
            params={"filter": "slug:contact-us"},
            headers={
                "Authorization": f"Ghost {token}",
                "Accept": "application/json"
            }
        ).json()

        if pages and len(pages.get("pages", [])) > 0:
            page_id = pages["pages"][0]["id"]
            result = update_ghost_page(
                page_id=page_id,
                content="""
                <h1>Get in Touch</h1>
                <p>We'd love to hear from you! Here's how you can reach us:</p>
                <ul>
                    <li>Email: contact@example.com</li>
                    <li>Twitter: @example</li>
                    <li>GitHub: github.com/example</li>
                </ul>
                """
            )
            response = json.loads(result)
            if "error" in response:
                print(f"Error updating page: {response['error']}")
            else:
                print("Page updated successfully!")
                print(json.dumps(response, indent=2))
        else:
            print("Contact Us page not found")
    except Exception as e:
        print(f"Error during test: {str(e)}")