
import os

path = r"d:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx"

try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Markers (copy exact indent from file view)
    start_marker = '                    {tabIndex === 0 && ('
    next_tab_marker = '                    {tabIndex === 1 && ('
    
    start_idx = content.find(start_marker)
    next_tab_idx = content.find(next_tab_marker)
    
    if start_idx == -1:
        print("Start marker not found")
    if next_tab_idx == -1:
        print("Next tab marker not found")
        
    if start_idx != -1 and next_tab_idx != -1:
        print(f"Found markers at {start_idx} and {next_tab_idx}")
        
        # Đoạn text nằm giữa start của tab 0 và start của tab 1
        # Cấu trúc: 
        # {tabIndex === 0 && ( ... )} \n\n {tabIndex === 1...
        # Tôi muốn replace từ start_idx đến (next_tab_idx - newline/indentation)
        
        # Tìm dấu đóng `)}` cuối cùng trước next_tab_idx
        chunk = content[start_idx:next_tab_idx]
        close_idx = chunk.rfind(')}')
        
        if close_idx != -1:
            real_end_idx = start_idx + close_idx + 2
            print(f"Found closing tag at relative {close_idx}, absolute {real_end_idx}")
            
            # Content mới
            new_tab_content = """                    {tabIndex === 0 && (
                        <DashboardTab
                            actionableItems={actionableItems}
                            isMobile={isMobile}
                            signing={signing}
                            processingReport={processingReport}
                            onTransferClick={handleOpenDetailView}
                            onRequestClick={handleOpenRequestDetail}
                            onReportClick={handleOpenReportDetail}
                            onSignTransfer={handleSign}
                            onProcessRequest={handleProcessRequest}
                            onSignReport={handleSignReport}
                            onRejectRequest={(item) => setRejectConfirm(item)}
                            onRejectReport={(item) => setRejectReportConfirm(item)}
                            currentUser={currentUser}
                            canSignSender={canSignSender}
                            canSignReceiver={canSignReceiver}
                            canSignAdmin={canSignAdmin}
                            isMyTurn={isMyTurn}
                            canProcessRequest={canProcessRequest}
                            canProcessReport={canProcessReport}
                        />
                    )}"""
            
            # Thay thế
            new_full_content = content[:start_idx] + new_tab_content + content[real_end_idx:]
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_full_content)
            print("Successfully replaced Tab 0.")
        else:
            print("Could not find closing tag ')}' in the chunk.")
            print(f"Chunk end snippet: {chunk[-100:]}")
            
except Exception as e:
    print(f"Error: {e}")
