# Cải Thiện UI/UX - MaterialPriceComparisonDetail

## 🎯 Các Cải Thiện Đề Xuất

### 1. Typography Improvements

#### Vấn đề hiện tại:
- Font sizes quá nhỏ (0.6rem, 0.65rem)
- Line height không đủ
- Không sử dụng theme typography

#### Giải pháp:
```jsx
// Thay đổi từ:
fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' }

// Thành:
fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' }
lineHeight: 1.5

// Hoặc sử dụng theme:
variant="caption" // thay vì custom fontSize
```

### 2. Theme Colors

#### Vấn đề hiện tại:
- Hardcoded colors (#fafafa, #eaf4e0, etc.)
- Không nhất quán với theme

#### Giải pháp:
```jsx
// Import theme
import { useTheme } from '@mui/material/styles';

// Trong component
const theme = useTheme();

// Thay đổi:
backgroundColor: '#fafafa' 
→ backgroundColor: theme.palette.background.neutral

backgroundColor: '#eaf4e0'
→ backgroundColor: theme.palette.success.lighter

backgroundColor: '#f9fbe7'
→ backgroundColor: theme.palette.warning.lighter

backgroundColor: '#f0f3f6'
→ backgroundColor: theme.palette.info.lighter

backgroundColor: '#ffebee'
→ backgroundColor: theme.palette.error.lighter

borderColor: '#e0e8f4'
→ borderColor: theme.palette.divider

borderColor: '#cbd5e1'
→ borderColor: theme.palette.grey[300]
```

### 3. Spacing Improvements

#### Vấn đề hiện tại:
- Padding quá nhỏ trên mobile
- Spacing không nhất quán

#### Giải pháp:
```jsx
// Tăng padding trên mobile
p: { xs: 1.5, sm: 2, md: 4 }
→ p: { xs: 2, sm: 2.5, md: 4 }

// Sử dụng theme spacing
spacing: { xs: 1, sm: 1 }
→ spacing: theme.spacing(1, 1.5)
```

### 4. Touch Targets (Mobile)

#### Vấn đề hiện tại:
- Clickable areas quá nhỏ trên mobile
- Khó tương tác

#### Giải pháp:
```jsx
// Đảm bảo minimum 44x44px
minHeight: { xs: '32px', sm: '24px' }
→ minHeight: { xs: '44px', sm: '32px' }

// Thêm padding cho touch
padding: { xs: '4px 2px', sm: '2px' }
→ padding: { xs: '8px 4px', sm: '4px' }
```

### 5. Visual Hierarchy

#### Header Section:
```jsx
// Thêm elevation và better spacing
<Paper 
  elevation={2} 
  sx={{ 
    p: { xs: 2, sm: 2.5, md: 4 }, 
    mb: { xs: 2, sm: 3 },
    borderRadius: { xs: 2, sm: 3 },
    background: 'white',
    border: `1px solid ${theme.palette.divider}`,
    // Thêm subtle shadow
    boxShadow: theme.shadows[2]
  }}
>
```

#### Deadline Alert:
```jsx
// Cải thiện styling
<Alert 
  severity="error" 
  icon={<AlertCircle size={20} />}
  sx={{ 
    mt: { xs: 1.5, sm: 2 },
    fontWeight: 600,
    fontSize: { xs: '0.8rem', sm: '0.875rem' },
    borderRadius: 2,
    // Thêm border để nổi bật
    border: `1px solid ${theme.palette.error.main}`,
    backgroundColor: theme.palette.error.lighter
  }}
>
```

### 6. Table Improvements

#### Sticky Columns:
```jsx
// Thêm subtle shadow cho sticky columns
...(isFixed && {
  position: 'sticky',
  left: fixedLeft,
  zIndex: 10,
  backgroundColor: 'white',
  // Thêm shadow để tách biệt
  boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
  borderRight: `2px solid ${theme.palette.divider}`
})
```

#### Row Hover:
```jsx
// Cải thiện hover effect
'&:hover': {
  backgroundColor: theme.palette.action.hover,
  transition: 'background-color 0.2s ease'
}
```

### 7. Button Improvements

#### Consistency:
```jsx
// Đảm bảo button sizes nhất quán
size="small" // hoặc "medium"
sx={{
  minHeight: { xs: 44, sm: 36 }, // Touch target
  px: { xs: 2, sm: 2.5 },
  fontSize: { xs: '0.875rem', sm: '0.9rem' }
}}
```

### 8. Accessibility

#### ARIA Labels:
```jsx
// Thêm ARIA labels
<Box
  role="region"
  aria-label="Kế hoạch đề xuất vật tư"
  data-paste-target="keHoachPaste"
>
```

#### Keyboard Navigation:
```jsx
// Cải thiện keyboard support
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setIsEditing(true);
  }
}}
tabIndex={canEditKeHoach && !isDeadlinePassed ? 0 : -1}
```

### 9. Animations & Transitions

#### Smooth Transitions:
```jsx
// Thêm transitions
sx={{
  transition: theme.transitions.create(
    ['background-color', 'opacity', 'transform'],
    { duration: theme.transitions.duration.short }
  )
}}
```

### 10. Code Organization

#### Extract Constants:
```jsx
// Tạo constants file
const TABLE_COLORS = {
  keHoach: (theme) => theme.palette.background.neutral,
  cungUng: (theme) => theme.palette.success.lighter,
  baoGia: (theme) => theme.palette.info.lighter,
  expired: (theme) => theme.palette.error.lighter,
  preview: (theme) => theme.palette.info.lighter
};

// Sử dụng
backgroundColor: TABLE_COLORS.keHoach(theme)
```

---

## 📝 Implementation Priority

### Phase 1: Critical (Làm ngay)
1. ✅ Tăng font sizes (0.7rem minimum)
2. ✅ Sử dụng theme colors
3. ✅ Cải thiện touch targets (44px minimum)

### Phase 2: Important (Tuần này)
4. ✅ Cải thiện visual hierarchy
5. ✅ Table styling improvements
6. ✅ Button consistency

### Phase 3: Polish (Tuần sau)
7. ✅ Animations & transitions
8. ✅ Accessibility enhancements
9. ✅ Code refactoring

---

## 🎨 Color Palette Mapping

| Current Color | Theme Color | Usage |
|--------------|-------------|-------|
| `#fafafa` | `theme.palette.background.neutral` | Kế hoạch background |
| `#eaf4e0` | `theme.palette.success.lighter` | Cung ứng background |
| `#f9fbe7` | `theme.palette.warning.lighter` | Cung ứng cells |
| `#f0f3f6` | `theme.palette.info.lighter` | Báo giá background |
| `#ffebee` | `theme.palette.error.lighter` | Expired state |
| `#e3f2fd` | `theme.palette.info.lighter` | Preview rows |
| `#fff3cd` | `theme.palette.warning.lighter` | Warning alert |
| `#e0e8f4` | `theme.palette.divider` | Borders |
| `#cbd5e1` | `theme.palette.grey[300]` | Strong borders |

---

## 📱 Responsive Breakpoints

Sử dụng theme breakpoints:
```jsx
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
```

---

## ✅ Checklist Implementation

- [ ] Typography improvements
- [ ] Theme colors migration
- [ ] Spacing adjustments
- [ ] Touch targets optimization
- [ ] Visual hierarchy improvements
- [ ] Table styling enhancements
- [ ] Button consistency
- [ ] Accessibility enhancements
- [ ] Animations & transitions
- [ ] Code refactoring

