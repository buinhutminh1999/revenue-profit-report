
import os

path = r"d:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx"

try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    start_marker = '                    {tabIndex === 0 && ('
    next_tab_marker = '                    {tabIndex === 1 && ('
    
    start_idx = content.find(start_marker)
    next_tab_idx = content.find(next_tab_marker)
    
    if start_idx != -1 and next_tab_idx != -1:
        chunk = content[start_idx:next_tab_idx]
        print(f"Chunk length: {len(chunk)}")
        print(f"Chunk tail (last 200 chars): {repr(chunk[-200:])}")
        
        close_idx = chunk.rfind(')}')
        if close_idx != -1:
            print(f"Found at {close_idx}")
        else:
            print("Not found ')}'")
            # Thử tìm các biến thể
            print(f"Find ') }}': {chunk.rfind(') }')}")
            print(f"Find ' )}}': {chunk.rfind(' )}')}")
            
except Exception as e:
    print(f"Error: {e}")
