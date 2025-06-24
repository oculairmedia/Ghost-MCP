import json
import requests
import os
import base64
import hashlib
import hmac
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def list_ghost_tags(page: int = 1, limit: int = 15, include: str = "count.posts") -> str:
    """
    Lists tags from Ghost blog with pagination.

    This function supports two usage scenarios:
      1) Listing tags
      2) Retrieving the tool's metadata by passing page="__tool_info__"

    Args:
        page (int): Page number for pagination
        limit (int): Number of tags per page
        include (str, optional): Include post count with tags

    Returns:
        str: JSON-formatted string containing the response
    """
    if page == "__tool_info__":
        info = {
            "name": "list_ghost_tags",
            "description": "Lists tags from Ghost blog with pagination",
            "args": {
                "page": {
                    "type": "integer",
                    "description": "Page number for pagination",
                    "required": False,
                    "default": 1
                },
                "limit": {
                    "type": "integer",
                    "description": "Number of tags per page",
                    "required": False,
                    "default": 15
                },
                "include": {
                    "type": "string",
                    "description": "Include post count with tags",
                    "required": False,
                    "default": "count.posts"
                }
            }
        }
        return json.dumps(info)

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
        url = f"{api_url}/ghost/api/admin/tags"
        
        params = {
            "page": page,
            "limit": limit,
            "include": include
        }

        print(f"Making request to: {url}")
        print(f"Headers: {headers}")
        print(f"Params: {json.dumps(params, indent=2)}")

        response = session.get(
            url,
            headers=headers,
            params=params,
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
    print("Testing list_ghost_tags tool...")
    
    # Example tags listing
    print("\nListing tags...")
    try:
        tags = list_ghost_tags(page=1, limit=10)
        response = json.loads(tags)
        if "error" in response:
            print(f"Error listing tags: {response['error']}")
        else:
            print("Tags retrieved successfully!")
            print(json.dumps(response, indent=2))
    except Exception as e:
        print(f"Error during test: {str(e)}")