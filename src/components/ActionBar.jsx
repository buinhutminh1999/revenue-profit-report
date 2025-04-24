<AppBar position="sticky" elevation={1} sx={{ mb: 2 }}>
<Toolbar>
    <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Chi Tiết Công Trình
    </Typography>
    <Button
        variant="contained"
        color="primary"
        onClick={handleAddRow}
        startIcon={<Add />}
        sx={{ mr: 1 }}
    >
        Thêm Dòng
    </Button>
    <Button
        variant="contained"
        color="primary"
        component="label"
        startIcon={<FileUpload />}
        sx={{ mr: 1 }}
    >
        Upload Excel
        <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={(e) =>
                handleFileUpload(
                    e,
                    setCostItems,
                    setLoading,
                    overallRevenue,
                    projectTotalAmount
                )
            }
        />
    </Button>
    <Button
        variant="contained"
        color="primary"
        onClick={() => exportToExcel(costItems)}
        startIcon={<FileDownload />}
        sx={{ mr: 1 }}
    >
        Xuất Excel
    </Button>
    <Button
        variant="contained"
        color="secondary"
        startIcon={<Save />}
        onClick={handleSave}
        sx={{ mr: 1 }}
    >
        Lưu
    </Button>
    <Button
        variant="contained"
        color="primary"
        onClick={handleOpenColumnsDialog}
        sx={{ mr: 1 }}
    >
        Tuỳ chọn cột
    </Button>
    <Button
        variant="contained"
        color="primary"
        onClick={() => navigate(-1)}
        startIcon={<ArrowBack />}
    >
        Quay lại
    </Button>
</Toolbar>
</AppBar>