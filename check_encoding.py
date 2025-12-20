
path = r"d:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx"
try:
    with open(path, 'rb') as f:
        for i, line in enumerate(f):
            if b'Qu' in line and b'l' in line: # Tìm dòng có thể chứa 'Quản lý'
                # In ra dòng đó nếu nó có vẻ giống target
                # 'Quản lý' utf-8: 51 75 e1 ba a3 6e 20 6c c3 bd
                # 'Quáº£n lĂ½' (double encoded utf-8 as latin1): 51 75 c3 a1 c2 ba c2 a3 6e 20 6c c4 82 c2 bd
                try:
                    text = line.decode('utf-8')
                    if 'Quản lý' in text or 'Quáº£n' in text:
                        print(f"Line {i+1}: {line}")
                        print(f"Hex: {line.hex()}")
                except:
                    pass
except Exception as e:
    print(f"Error: {e}")
