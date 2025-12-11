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

def create_draft_post(session, api_url: str, headers: dict) -> str:
    """
    Creates a new draft post in Ghost blog.
    
    Args:
        session: The requests session object
        api_url (str): The Ghost API URL
        headers (dict): The headers for the API request
    
    Returns:
        str: The ID of the newly created draft post
    """
    url = f"{api_url}/ghost/api/admin/posts/?source=html"
    post_data = {
        "posts": [{
            "title": "New Draft Post",
            "status": "draft",
            "html": "<p>This is the initial content of the draft post.</p>"
        }]
    }
    
    response = session.post(
        url,
        headers=headers,
        json=post_data,
        timeout=30
    )
    response.raise_for_status()
    new_post = response.json()
    return new_post["posts"][0]["id"]

def update_ghost_post(post_id: str, title: str = None, content: str = None, status: str = None, tags: list = None, featured: bool = None) -> str:
    """
    Updates an existing post in Ghost blog.

    This function supports two usage scenarios:
      1) Updating a post
      2) Retrieving the tool's metadata by passing post_id="__tool_info__"

    Args:
        post_id (str): The ID of the post to update
        title (str, optional): New title for the post
        content (str, optional): New content/body for the post
        status (str, optional): New status (draft, published, scheduled)
        tags (list, optional): New list of tag objects (each with 'name')
        featured (bool, optional): Whether this is a featured post

    Returns:
        str: JSON-formatted string containing the response
    """
    if post_id == "__tool_info__":
        info = {
            "name": "update_ghost_post",
            "description": "Updates an existing post in Ghost blog",
            "args": {
                "post_id": {
                    "type": "string",
                    "description": "The ID of the post to update",
                    "required": True
                },
                "title": {
                    "type": "string",
                    "description": "New title for the post",
                    "required": False
                },
                "content": {
                    "type": "string",
                    "description": "New content/body for the post",
                    "required": False
                },
                "status": {
                    "type": "string",
                    "description": "New status (draft, published, scheduled)",
                    "required": False
                },
                "tags": {
                    "type": "list",
                    "description": "New list of tag objects (each with 'name')",
                    "required": False
                },
                "featured": {
                    "type": "boolean",
                    "description": "Whether this is a featured post",
                    "required": False
                }
            }
        }
        return json.dumps(info)

    if not post_id:
        return json.dumps({"error": "Post ID is required"})

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

        # First get the current post to get its updated_at timestamp
        get_url = f"{api_url}/ghost/api/admin/posts/{post_id}"
        print(f"Fetching current post from: {get_url}")
        
        get_response = session.get(
            get_url,
            headers=headers,
            timeout=30
        )
        get_response.raise_for_status()
        current_post = get_response.json()
        
        if not current_post.get("posts") or len(current_post["posts"]) == 0:
            return json.dumps({"error": f"Post {post_id} not found"})
            
        updated_at = current_post["posts"][0]["updated_at"]

        # Ghost Admin API endpoint for update
        url = f"{api_url}/ghost/api/admin/posts/{post_id}/?source=html"

        # Build update payload with only provided fields
        post_data = {"posts": [{"updated_at": updated_at}]}  # Include updated_at for collision detection
        update_fields = {
            "title": title,
            "html": content,
            "status": status,
            "featured": featured
        }
        
        for field, value in update_fields.items():
            if value is not None:
                post_data["posts"][0][field] = value

        if tags is not None:
            post_data["posts"][0]["tags"] = tags

        print(f"Making update request to: {url}")
        print(f"Headers: {headers}")
        print(f"Payload: {json.dumps(post_data, indent=2)}")

        response = session.put(
            url,
            headers=headers,
            json=post_data,
            timeout=30
        )
        response.raise_for_status()

        updated_post = response.json()
        
        # Extract both Lexical and HTML content from the response
        if 'posts' in updated_post and len(updated_post['posts']) > 0:
            post = updated_post['posts'][0]
            lexical_content = post.get('lexical', '')
            html_content = post.get('html', '')
            post['lexical'] = lexical_content
            post['html'] = html_content
        
        return json.dumps(updated_post)
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
    print("Testing update_ghost_post tool...")
    
    # Example post update
    print("\nUpdating post...")
    try:
        # Get the most recent draft post
        api_url = os.environ.get("GHOST_API_URL", "http://192.168.50.80:8083").rstrip("/")
        admin_id = "67b2d2824fdabf0001eb99ea"
        admin_secret = "100eda163e9fea6906fbd7ddc841812c70561b19ab2e6d7b31f844f6ccd7b05d"
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

        posts = session.get(
            f"{api_url}/ghost/api/admin/posts",
            params={"filter": "status:draft", "limit": 1},
            headers=headers
        ).json()

        if posts and len(posts.get("posts", [])) > 0:
            post_id = posts["posts"][0]["id"]
        else:
            print("No draft posts found. Creating a new draft post...")
            post_id = create_draft_post(session, api_url, headers)
            print(f"Created new draft post with ID: {post_id}")

        result = update_ghost_post(
            post_id=post_id,
            title="Updated Test Post",
            content="<p>This post has been updated via the API, again!</p><p>Here's a second paragraph to demonstrate multi-paragraph content.</p><h2>A New Section</h2><p>This is a new section with some <strong>bold</strong> and <em>italic</em> text.</p>",
            status="published"
        )
        response = json.loads(result)
        if "error" in response:
            print(f"Error updating post: {response['error']}")
        else:
            print("Post updated successfully!")
            print(json.dumps(response, indent=2))
            print("\nUpdated post content:")
            if "posts" in response and len(response["posts"]) > 0:
                post = response["posts"][0]
                if "html" in post:
                    print(post["html"])
                elif "lexical" in post:
                    print("Lexical content:", post["lexical"])
                else:
                    print("HTML content not available. Title:", post.get("title", "No title available"))
            else:
                print("No post data available in the response.")
    except Exception as e:
        print(f"Error during test: {str(e)}")
