
import os

path = r"d:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx"

try:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add Import
    if 'import DashboardTab' not in content:
        content = content.replace(
            'import { StatCardSkeleton, TransferSkeleton, AssetCardSkeleton } from "../../components/assets/AssetSkeletons";',
            'import { StatCardSkeleton, TransferSkeleton, AssetCardSkeleton } from "../../components/assets/AssetSkeletons";\nimport DashboardTab from "../../components/tabs/DashboardTab";'
        )
        print("Import added.")

    # 2. Fix Bug Stat Card
    old_bug_snippet = """                // ✅ MỚI: Click để xem tất cả các phiếu đang xử lý
                onClick: () => {
                    // Chuyển sang tab luân chuyển và lọc các phiếu chưa hoàn thành
                    setStatusMulti(ALL_STATUS.filter(s => s !== 'COMPLETED'));
                    setTabIndex(1);
                }"""

    new_bug_snippet = """                // ✅ FIX: Chuyển về Dashboard (Tab 0) vì đó là nơi hiển thị TẤT CẢ công việc đang xử lý
                onClick: () => setTabIndex(0)"""

    if old_bug_snippet in content:
        content = content.replace(old_bug_snippet, new_bug_snippet)
        print("Bug fix applied.")
    else:
        print("Bug snippet not found (maybe indentation mismatch?).")


    # 3. Replace Tab 0 Content
    start_marker = '{tabIndex === 0 && ('
    next_tab_marker = '{tabIndex === 1 && ('
    
    start_idx = content.find(start_marker)
    next_tab_idx = content.find(next_tab_marker)
    
    if start_idx != -1 and next_tab_idx != -1:
        # Tìm dấu đóng cuối cùng trước tab 1
        chunk = content[start_idx:next_tab_idx]
        close_idx = chunk.rfind(')}')
        
        if close_idx != -1:
            real_end_idx = start_idx + close_idx + 2
            
            new_tab_0_indented = """                    {tabIndex === 0 && (
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
            
            content = content[:start_idx] + new_tab_0_indented + content[real_end_idx:]
            print("DashboardTab replaced.")
        else:
            print("Could not find closing tag for Tab 0.")
    else:
        print(f"Could not find tab markers. Start: {start_idx}, Next: {next_tab_idx}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("File saved successfully.")

except Exception as e:
    print(f"Error: {e}")
