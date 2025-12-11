import json
import requests
import os
import base64
import hashlib
import hmac
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_ghost_tag(name: str, description: str = None, accent_color: str = None, visibility: str = "public") -> str:
    """
    Creates a new tag in Ghost blog.

    This function supports two usage scenarios:
      1) Creating a tag
      2) Retrieving the tool's metadata by passing name="__tool_info__"

    Args:
        name (str): The name of the tag
        description (str, optional): Description of the tag
        accent_color (str, optional): The accent color for the tag (hex code)
        visibility (str, optional): Tag visibility (public or internal)

    Returns:
        str: JSON-formatted string containing the response
    """
    if name == "__tool_info__":
        info = {
            "name": "create_ghost_tag",
            "description": "Creates a new tag in Ghost blog",
            "args": {
                "name": {
                    "type": "string",
                    "description": "The name of the tag",
                    "required": True
                },
                "description": {
                    "type": "string",
                    "description": "Description of the tag",
                    "required": False
                },
                "accent_color": {
                    "type": "string",
                    "description": "The accent color for the tag (hex code)",
                    "required": False
                },
                "visibility": {
                    "type": "string",
                    "description": "Tag visibility (public or internal)",
                    "required": False,
                    "default": "public"
                }
            }
        }
        return json.dumps(info)

    if not name:
        return json.dumps({"error": "Tag name is required"})

    api_url = os.environ.get("GHOST_API_URL", "https://blog.emmanuelu.com").rstrip("/")
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

        # Build tag data
        tag_data = {
            "tags": [{
                "name": name,
                "visibility": visibility
            }]
        }

        if description:
            tag_data["tags"][0]["description"] = description
        if accent_color:
            tag_data["tags"][0]["accent_color"] = accent_color

        print(f"Making request to: {url}")
        print(f"Headers: {headers}")
        print(f"Payload: {json.dumps(tag_data, indent=2)}")

        response = session.post(
            url,
            headers=headers,
            json=tag_data,
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
    print("Testing create_ghost_tag tool...")
    
    # Example tag creation
    print("\nCreating tag...")
    try:
        result = create_ghost_tag(
            name="Technology",
            description="Posts about technology and software",
            accent_color="#007bff"
        )
        response = json.loads(result)
        if "error" in response:
            print(f"Error creating tag: {response['error']}")
        else:
            print("Tag created successfully!")
            print(json.dumps(response, indent=2))
    except Exception as e:
        print(f"Error during test: {str(e)}")