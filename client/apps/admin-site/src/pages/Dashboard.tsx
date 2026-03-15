import { useState, useEffect } from 'react'
import { Search, Plus, FileUp, Edit2, Trash2, Mail } from 'lucide-react'
import * as XLSX from 'xlsx'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
  role?: string
  city?: string
  selectedSession?: string
  benefits?: string[]
  confirmationSent?: boolean
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState({ session: '', completed: 'all', confSent: 'all' })
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'TENANT',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/users`,
      )
      const { data } = await res.json()
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to fetch users', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(users)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Waitlist')
    XLSX.writeFile(wb, 'Upward_Waitlist.xlsx')
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/users/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([newUser]),
      })
      setShowAddModal(false)
      setNewUser({ email: '', firstName: '', lastName: '', phone: '', role: 'TENANT' })
      fetchUsers()
    } catch (err) {
      console.error('Failed to add user', err)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)

      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admin/users/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(() => {
        alert('Bulk upload successful')
        fetchUsers()
      })
    }
    reader.readAsBinaryString(file)
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(search.toLowerCase()))

    const matchesSession = !filter.session || user.selectedSession === filter.session
    const isCompleted =
      user.firstName && user.lastName && user.phone && user.benefits && user.benefits.length > 0
    const matchesCompleted =
      filter.completed === 'all' ||
      (filter.completed === 'done' && isCompleted) ||
      (filter.completed === 'pending' && !isCompleted)

    const matchesConf =
      filter.confSent === 'all' ||
      (filter.confSent === 'true' && user.confirmationSent) ||
      (filter.confSent === 'false' && !user.confirmationSent)

    return matchesSearch && matchesSession && matchesCompleted && matchesConf
  })

  return (
    <div>
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="card" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '20px' }}>Add New User</h3>
            <form onSubmit={handleAddUser}>
              <input
                type="email"
                placeholder="Email"
                required
                style={{ width: '100%', marginBottom: '12px' }}
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <input
                type="text"
                placeholder="First Name"
                style={{ width: '100%', marginBottom: '12px' }}
                value={newUser.firstName}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Last Name"
                style={{ width: '100%', marginBottom: '12px' }}
                value={newUser.lastName}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
              />
              <select
                style={{ width: '100%', marginBottom: '12px' }}
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="TENANT">TENANT</option>
                <option value="AGENT">AGENT</option>
                <option value="LANDLORD">LANDLORD</option>
              </select>
              <input
                type="tel"
                placeholder="Phone"
                style={{ width: '100%', marginBottom: '20px' }}
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="card"
                  style={{ flex: 1, padding: '10px' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '28px', marginBottom: '4px' }}>Waitlist Users</h2>
          <p style={{ color: 'var(--muted)' }}>Managing {filteredUsers.length} entries</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="card"
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
            }}
            onClick={handleExport}
          >
            <FileUp size={16} /> Export
          </button>
          <label
            className="card"
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <FileUp size={16} /> Bulk Upload
            <input type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          </label>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '40px' }}
            />
          </div>

          <select
            value={filter.completed}
            onChange={(e) => setFilter({ ...filter, completed: e.target.value })}
          >
            <option value="all">Completion Status</option>
            <option value="done">Fully Completed</option>
            <option value="pending">Incomplete</option>
          </select>

          <select
            value={filter.confSent}
            onChange={(e) => setFilter({ ...filter, confSent: e.target.value })}
          >
            <option value="all">Confirmation Status</option>
            <option value="true">Sent</option>
            <option value="false">Not Sent</option>
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>City</th>
                <th>Completed</th>
                <th>Conf. Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCompleted =
                    user.firstName &&
                    user.lastName &&
                    user.phone &&
                    user.benefits &&
                    user.benefits.length > 0
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}` : '---'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {user.phone || 'No phone'}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {user.role || '---'}
                        </span>
                      </td>
                      <td>{user.city || '---'}</td>
                      <td>
                        <span className={`badge badge-${!!isCompleted}`}>
                          {isCompleted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${!!user.confirmationSent}`}>
                          {user.confirmationSent ? 'Sent' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button style={{ color: 'var(--muted)' }}>
                            <Edit2 size={16} />
                          </button>
                          <button style={{ color: 'var(--muted)' }}>
                            <Mail size={16} />
                          </button>
                          <button style={{ color: '#ef4444' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
