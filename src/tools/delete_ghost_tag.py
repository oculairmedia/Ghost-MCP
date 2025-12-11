import json
import requests
import os
import base64
import hashlib
import hmac
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def b64encode(obj):
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b'=').decode('utf-8')

def create_token(key_id: str, key_secret: str) -> str:
    """
    Creates a Ghost Admin API JWT token without using PyJWT.
    Uses base64 encoding and HMAC-SHA256 for manual JWT creation.

    Args:
        key_id (str): The Ghost Admin API key ID
        key_secret (str): The Ghost Admin API key secret

    Returns:
        str: The JWT token
    """
    # Create header
    header = {
        "alg": "HS256",
        "typ": "JWT",
        "kid": key_id
    }

    # Create payload
    iat = int(time.time())
    payload = {
        "iat": iat,
        "exp": iat + 300,  # Token expires in 5 minutes
        "aud": "/admin/"
    }

    # Base64 encode header and payload
    header_encoded = b64encode(header)
    payload_encoded = b64encode(payload)

    # Create signature
    message = f"{header_encoded}.{payload_encoded}"
    key = bytes.fromhex(key_secret)
    signature = hmac.new(key, message.encode(), hashlib.sha256).digest()
    signature_encoded = base64.urlsafe_b64encode(signature).rstrip(b'=').decode('utf-8')

    # Combine all parts
    token = f"{header_encoded}.{payload_encoded}.{signature_encoded}"
    return token

def delete_ghost_tag(tag_id: str) -> str:
    """
    Deletes a tag from Ghost blog.

    This function supports two usage scenarios:
      1) Deleting a tag
      2) Retrieving the tool's metadata by passing tag_id="__tool_info__"

    Args:
        tag_id (str): The ID of the tag to delete

    Returns:
        str: JSON-formatted string containing the response
    """
    if tag_id == "__tool_info__":
        info = {
            "name": "delete_ghost_tag",
            "description": "Deletes a tag from Ghost blog",
            "args": {
                "tag_id": {
                    "type": "string",
                    "description": "The ID of the tag to delete",
                    "required": True
                }
            }
        }
        return json.dumps(info)

    if not tag_id:
        return json.dumps({"error": "Tag ID is required"})

    api_url = os.environ.get("GHOST_API_URL", "http://192.168.50.80:8083").rstrip("/")
    admin_id = "67b2d2824fdabf0001eb99ea"
    admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"

    try:
        token = create_token(admin_id, admin_secret)
        print(f"Generated token: {token}")

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
        url = f"{api_url}/ghost/api/admin/tags/{tag_id}"

        print(f"Making request to: {url}")
        print(f"Headers: {headers}")

        response = session.delete(
            url,
            headers=headers,
            timeout=30
        )
        print(f"Response status code: {response.status_code}")
        print(f"Response content: {response.text}")
        
        response.raise_for_status()
        
        # Ghost returns 204 No Content for successful deletion
        if response.status_code == 204:
            return json.dumps({"success": True, "message": f"Tag {tag_id} deleted successfully"})
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
    print("Testing delete_ghost_tag tool...")
    
    # Example tag deletion
    print("\nDeleting tag...")
    try:
        # Get the test tag we created earlier
        api_url = os.environ.get("GHOST_API_URL", "http://192.168.50.80:8083").rstrip("/")
        list_url = f"{api_url}/ghost/api/admin/tags/"
        admin_id = "67b2d2824fdabf0001eb99ea"
        admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"
        list_headers = {
            "Authorization": f"Ghost {create_token(admin_id, admin_secret)}",
            "Accept": "application/json"
        }
        tags = requests.get(
            list_url,
            params={"filter": "slug:test"},
            headers=list_headers
        )
        print(f"List tags response status: {tags.status_code}")
        tags_json = tags.json()
        print(f"List tags response: {tags_json}")

        if tags_json and len(tags_json.get("tags", [])) > 0:
            tag_id = tags_json["tags"][0]["id"]
            print(f"Deleting tag with ID: {tag_id}")
            result = delete_ghost_tag(tag_id)
            response = json.loads(result)
            if "error" in response:
                print(f"Error deleting tag: {response['error']}")
            else:
                print("Tag deleted successfully!")
                print(json.dumps(response, indent=2))
        else:
            print("Test tag not found")
    except Exception as e:
        print(f"Error during test: {str(e)}")