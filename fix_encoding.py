
import os

path = r"d:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx"
# backup đã tạo rồi, ko cần tạo lại nếu tồn tại

try:
    with open(path, 'rb') as f:
        content = f.read()

    # Bỏ BOM nếu có
    if content.startswith(b'\xef\xbb\xbf'):
        content = content[3:]

    try:
        # File hiện tại là UTF-8 (nhưng nội dung sai)
        s = content.decode('utf-8')
        
        # Thử fix với latin1 (đảm bảo ko lỗi encode)
        s_fixed = s.encode('latin1').decode('utf-8')
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write(s_fixed)
        print("Fixed encoding successfully with latin1.")
        
    except UnicodeEncodeError as e:
        print(f"UnicodeEncodeError: {e}")
    except UnicodeDecodeError as e:
        # Nếu decode utf-8 failed ở bước cuối, có thể file gốc không phải utf-8 valid byte sequence
        print(f"UnicodeDecodeError: {e}")

except Exception as e:
    print(f"Error: {e}")
