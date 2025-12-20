
import os

path = r"d:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx"

try:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start_idx = 2173  # Line 2174 (1-based)
    end_idx = 2335    # Line 2335 (1-based, inclusive if slice is :2335 then lines[2334] is included)
    
    # Validation
    # Line 2174: {tabIndex === 0 && (
    # Line 2335: )}
    
    if len(lines) > end_idx and \
       'tabIndex === 0' in lines[start_idx] and \
       ')}' in lines[end_idx-1]:
        
        indent = "                    " # 20 spaces
        new_content = indent + "{tabIndex === 0 && (\n" + \
                      indent + "    <DashboardTab\n" + \
                      indent + "        actionableItems={actionableItems}\n" + \
                      indent + "        isMobile={isMobile}\n" + \
                      indent + "        signing={signing}\n" + \
                      indent + "        processingReport={processingReport}\n" + \
                      indent + "        onTransferClick={handleOpenDetailView}\n" + \
                      indent + "        onRequestClick={handleOpenRequestDetail}\n" + \
                      indent + "        onReportClick={handleOpenReportDetail}\n" + \
                      indent + "        onSignTransfer={handleSign}\n" + \
                      indent + "        onProcessRequest={handleProcessRequest}\n" + \
                      indent + "        onSignReport={handleSignReport}\n" + \
                      indent + "        onRejectRequest={(item) => setRejectConfirm(item)}\n" + \
                      indent + "        onRejectReport={(item) => setRejectReportConfirm(item)}\n" + \
                      indent + "        currentUser={currentUser}\n" + \
                      indent + "        canSignSender={canSignSender}\n" + \
                      indent + "        canSignReceiver={canSignReceiver}\n" + \
                      indent + "        canSignAdmin={canSignAdmin}\n" + \
                      indent + "        isMyTurn={isMyTurn}\n" + \
                      indent + "        canProcessRequest={canProcessRequest}\n" + \
                      indent + "        canProcessReport={canProcessReport}\n" + \
                      indent + "    />\n" + \
                      indent + ")}\n"
        
        # Replace slice
        lines[start_idx:end_idx] = [new_content]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Successfully replaced Dashboard Tab using line indices.")
        
    else:
        print("Validation mismatch!")
        print(f"Line {start_idx+1}: {lines[start_idx].strip() if len(lines) > start_idx else 'EOF'}")
        print(f"Line {end_idx}: {lines[end_idx-1].strip() if len(lines) > end_idx-1 else 'EOF'}")

except Exception as e:
    print(f"Error: {e}")
