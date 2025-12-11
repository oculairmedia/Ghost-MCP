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

def update_ghost_tag(tag_id: str, name: str = None, description: str = None, accent_color: str = None, visibility: str = None) -> str:
    """
    Updates an existing tag in Ghost blog.

    This function supports two usage scenarios:
      1) Updating a tag
      2) Retrieving the tool's metadata by passing tag_id="__tool_info__"

    Args:
        tag_id (str): The ID of the tag to update
        name (str, optional): New name for the tag
        description (str, optional): New description for the tag
        accent_color (str, optional): New accent color (hex code)
        visibility (str, optional): New visibility setting (public or internal)

    Returns:
        str: JSON-formatted string containing the response
    """
    if tag_id == "__tool_info__":
        info = {
            "name": "update_ghost_tag",
            "description": "Updates an existing tag in Ghost blog",
            "args": {
                "tag_id": {
                    "type": "string",
                    "description": "The ID of the tag to update",
                    "required": True
                },
                "name": {
                    "type": "string",
                    "description": "New name for the tag",
                    "required": False
                },
                "description": {
                    "type": "string",
                    "description": "New description for the tag",
                    "required": False
                },
                "accent_color": {
                    "type": "string",
                    "description": "New accent color (hex code)",
                    "required": False
                },
                "visibility": {
                    "type": "string",
                    "description": "New visibility setting (public or internal)",
                    "required": False
                }
            }
        }
        return json.dumps(info)

    if not tag_id:
        return json.dumps({"error": "Tag ID is required"})

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

        # First get the current tag to get its updated_at timestamp
        get_url = f"{api_url}/ghost/api/admin/tags/{tag_id}"
        print(f"Fetching current tag from: {get_url}")
        
        get_response = session.get(
            get_url,
            headers=headers,
            timeout=30
        )
        get_response.raise_for_status()
        current_tag = get_response.json()
        
        if not current_tag.get("tags") or len(current_tag["tags"]) == 0:
            return json.dumps({"error": f"Tag {tag_id} not found"})
            
        updated_at = current_tag["tags"][0]["updated_at"]

        # Ghost Admin API endpoint for update
        url = f"{api_url}/ghost/api/admin/tags/{tag_id}"

        # Build update payload with only provided fields
        tag_data = {"tags": [{"updated_at": updated_at}]}  # Include updated_at for collision detection
        update_fields = {
            "name": name,
            "description": description,
            "accent_color": accent_color,
            "visibility": visibility
        }
        
        for field, value in update_fields.items():
            if value is not None:
                tag_data["tags"][0][field] = value

        print(f"Making update request to: {url}")
        print(f"Headers: {headers}")
        print(f"Payload: {json.dumps(tag_data, indent=2)}")

        response = session.put(
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
    print("Testing update_ghost_tag tool...")
    
    # Example tag update
    print("\nUpdating tag...")
    try:
        # Get the Technology tag we created earlier
        api_url = os.environ.get("GHOST_API_URL", "https://blog.emmanuelu.com").rstrip("/")
        admin_id = "67b2d2824fdabf0001eb99ea"
        admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"
        token = create_token(admin_id, admin_secret)
        
        tags = requests.get(
            f"{api_url}/ghost/api/admin/tags",
            params={"filter": "slug:technology-2"},
            headers={
                "Authorization": f"Ghost {token}",
                "Accept": "application/json"
            }
        ).json()

        if tags and len(tags.get("tags", [])) > 0:
            tag_id = tags["tags"][0]["id"]
            result = update_ghost_tag(
                tag_id=tag_id,
                name="Tech and Software",
                description="Posts about technology, software development, and tech news",
                accent_color="#0066cc"  # Slightly darker blue
            )
            response = json.loads(result)
            if "error" in response:
                print(f"Error updating tag: {response['error']}")
            else:
                print("Tag updated successfully!")
                print(json.dumps(response, indent=2))
        else:
            print("Technology tag not found")
    except Exception as e:
        print(f"Error during test: {str(e)}")