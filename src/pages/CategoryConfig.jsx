// src/pages/CategoryConfig.jsx
import React, { useState, useEffect } from 'react'
import {
  Box, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton
} from '@mui/material'
import { Add, Edit, Delete } from '@mui/icons-material'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase-config'

export default function CategoryConfig() {
  const [rows, setRows]     = useState([])
  const [editing, setEdit]  = useState(null)
  const [label, setLabel]   = useState('')
  const [key, setKey]       = useState('')

  // 1) Load categories
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'categories'))
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })()
  }, [])

  // 2) Thêm / cập nhật category
  const handleSave = async () => {
    if (editing) {
      await updateDoc(doc(db, 'categories', editing), { key, label })
    } else {
      await addDoc(collection(db, 'categories'), { key, label })
    }
    // reload
    const snap = await getDocs(collection(db, 'categories'))
    setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setEdit(null); setKey(''); setLabel('')
  }

  const startEdit = r => {
    setEdit(r.id)
    setKey(r.key)
    setLabel(r.label)
  }

  const handleDelete = async id => {
    await deleteDoc(doc(db, 'categories', id))
    setRows(rows.filter(r => r.id !== id))
  }

  return (
    <Box p={2}>
      {/* Form nhập key / label */}
      <Box display="flex" gap={2} mb={2}>
        <TextField label="Key"   value={key}   onChange={e => setKey(e.target.value)} />
        <TextField label="Label" value={label} onChange={e => setLabel(e.target.value)} />
        <Button variant="contained" startIcon={<Add />} onClick={handleSave}>
          {editing ? 'Cập nhật' : 'Thêm'}
        </Button>
      </Box>

      {/* Bảng danh sách */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.key}</TableCell>
                <TableCell>{r.label}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => startEdit(r)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(r.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
