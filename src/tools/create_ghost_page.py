import json
import requests
import os
import base64
import hashlib
import hmac
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_ghost_page(title: str, content: str, status: str = "draft", featured: bool = False) -> str:
    """
    Creates a new page in Ghost blog.

    This function supports two usage scenarios:
      1) Creating a page
      2) Retrieving the tool's metadata by passing title="__tool_info__"

    Args:
        title (str): The title of the page
        content (str): The content/body of the page (HTML or Markdown)
        status (str, optional): Page status (draft, published, scheduled)
        featured (bool, optional): Whether this is a featured page

    Returns:
        str: JSON-formatted string containing the response
    """
    if title == "__tool_info__":
        info = {
            "name": "create_ghost_page",
            "description": "Creates a new page in Ghost blog",
            "args": {
                "title": {
                    "type": "string",
                    "description": "The title of the page",
                    "required": True
                },
                "content": {
                    "type": "string",
                    "description": "The content/body of the page (HTML or Markdown)",
                    "required": True
                },
                "status": {
                    "type": "string",
                    "description": "Page status (draft, published, scheduled)",
                    "required": False,
                    "default": "draft"
                },
                "featured": {
                    "type": "boolean",
                    "description": "Whether this is a featured page",
                    "required": False,
                    "default": False
                }
            }
        }
        return json.dumps(info)

    if not title or not content:
        return json.dumps({"error": "Title and content are required"})

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
        url = f"{api_url}/ghost/api/admin/pages"

        payload = {
            "pages": [{
                "title": title,
                "html": content,
                "status": status,
                "featured": featured
            }]
        }

        print(f"Making request to: {url}")
        print(f"Headers: {headers}")
        print(f"Payload: {json.dumps(payload, indent=2)}")

        response = session.post(
            url,
            headers=headers,
            json=payload,
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
    print("Testing create_ghost_page tool...")
    
    # Example page creation
    print("\nCreating page...")
    try:
        result = create_ghost_page(
            title="Contact Us",
            content="<h1>Get in Touch</h1><p>We'd love to hear from you! Here's how you can reach us...</p>",
            status="published"
        )
        response = json.loads(result)
        if "error" in response:
            print(f"Error creating page: {response['error']}")
        else:
            print("Page created successfully!")
            print(json.dumps(response, indent=2))
    except Exception as e:
        print(f"Error during test: {str(e)}")