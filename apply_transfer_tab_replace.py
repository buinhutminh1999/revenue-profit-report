import os

file_path = r'd:\Project\revenue-profit-report\src\pages\assets\AssetTransferPage.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_mode = False
skip_reason = ""

# Markers for filteredTransfers removal
filtered_start = "    const filteredTransfers = useMemo(() => {"
filtered_end = "    }, [transfers, statusMulti, fromDeptIds, toDeptIds, createdByDeb, debSearch]);"

# Markers for Drawer removal
drawer_start = "            {/* ✅ Cải thiện: Drawer filter với responsive design */}"
drawer_end = "            </Drawer>"

# Markers for Tab 1 Replacement
tab1_start = "                    {tabIndex === 1 && ("
# tab1_end is detected by finding the next tab start or matching brace logic, 
# but simply looking for tabIndex === 2 might be safer if structure is consistent.
tab2_start = "                    {tabIndex === 2 && ("

# Markers for State removal
states_to_remove = [
    "const [drawerOpen, setDrawerOpen] = useState(false);",
    "const [statusMulti, setStatusMulti] = useState([]);",
    "const [fromDeptIds, setFromDeptIds] = useState([]);",
    "const [toDeptIds, setToDeptIds] = useState([]);",
    "const [createdBy, setCreatedBy] = useState(\"\");",
    "const [createdByDeb, setCreatedByDeb] = useState(\"\");",
    "useEffect(() => { const id = setTimeout(() => setCreatedByDeb(createdBy), 300); return () => clearTimeout(id) }, [createdBy]);"
]

import_added = False
dashboard_tab_import = "import DashboardTab from \"../../components/tabs/DashboardTab\";"

for i, line in enumerate(lines):
    # 1. Add Import
    if not import_added and dashboard_tab_import in line:
        new_lines.append(line)
        new_lines.append("import TransferListTab from \"../../components/tabs/TransferListTab\";\n")
        import_added = True
        continue

    # 2. Remove States
    is_state_line = False
    for s in states_to_remove:
        if s in line.strip():
            new_lines.append(f"    // {line.strip()} // MOVED TO TransferListTab\n")
            is_state_line = True
            break
    if is_state_line:
        continue

    # 3. Remove filteredTransfers
    if filtered_start in line:
        skip_mode = True
        skip_reason = "filteredTransfers"
        new_lines.append("    // filteredTransfers logic moved to TransferListTab\n")
        continue
    
    if skip_mode and skip_reason == "filteredTransfers":
        if filtered_end in line:
            skip_mode = False
            skip_reason = ""
        continue

    # 4. Remove Drawer
    if drawer_start in line:
        skip_mode = True
        skip_reason = "drawer"
        new_lines.append("            {/* Drawer moved to TransferListTab */}\n")
        continue

    if skip_mode and skip_reason == "drawer":
        if drawer_end in line:
            skip_mode = False
            skip_reason = ""
        continue

    # 5. Replace Tab 1
    if tab1_start in line:
        skip_mode = True
        skip_reason = "tab1"
        new_lines.append(line) # Keep the condition line
        # Insert Component
        new_lines.append("                        <TransferListTab\n")
        new_lines.append("                            isMobile={isMobile}\n")
        new_lines.append("                            search={search}\n")
        new_lines.append("                            setSearch={setSearch}\n")
        new_lines.append("                            debSearch={debSearch}\n")
        new_lines.append("                            transfers={transfers}\n")
        new_lines.append("                            departments={departments}\n")
        new_lines.append("                            currentUser={currentUser}\n")
        new_lines.append("                            permissions={permissions}\n")
        new_lines.append("                            onOpenDetail={handleOpenDetailView}\n")
        new_lines.append("                            onOpenTransferModal={handleOpenTransferModal}\n")
        new_lines.append("                            onDeleteTransfer={deleteTransfer}\n")
        new_lines.append("                        />\n")
        new_lines.append("                    )}\n") # Close the condition
        continue

    if skip_mode and skip_reason == "tab1":
        if tab2_start in line:
            skip_mode = False
            skip_reason = ""
            new_lines.append("\n") # Add spacing
            new_lines.append(line) # Add the Tab 2 start line
        continue

    if not skip_mode:
        # Check for Escape key handler removal (optional but good practice)
        if "if (drawerOpen) {" in line:
             new_lines.append(f"            // {line.strip()} // MOVED\n")
             continue
        if "setDrawerOpen(false);" in line and "if (drawerOpen)" not in lines[i-1]: # Check context if needed
             # Only comment if it looks like the shortcut one
             pass
        
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated AssetTransferPage.jsx")
