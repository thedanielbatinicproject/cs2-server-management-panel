import React, { useState, useEffect } from 'react';
import {
  Container,
  Navbar,
  Nav,
  NavDropdown,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Alert,
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { users as usersApi } from '../api';
import { User, PermissionLevel } from '../types';
import { useAuth } from '../App';

const UserManager: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: 'viewer' as string,
    permissions: {
      servers: 'view' as PermissionLevel,
      maps: 'view' as PermissionLevel,
      prompts: 'view' as PermissionLevel,
    },
  });

  const isSuperadmin = currentUser?.role === 'superadmin' || currentUser?.isSuperuser;
  const isAdmin = currentUser?.role === 'admin';

  const load = async () => {
    try {
      const res = await usersApi.list();
      setUsers(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load users');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setForm({
      username: '',
      password: '',
      role: 'viewer',
      permissions: { servers: 'view', maps: 'view', prompts: 'view' },
    });
    setEditUser(null);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setForm({
      username: u.username,
      password: '',
      role: u.role,
      permissions: u.permissions || { servers: 'view', maps: 'view', prompts: 'view' },
    });
    setEditUser(u);
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editUser) {
        const data: any = {
          username: form.username,
          role: form.role,
          permissions: form.permissions,
        };
        if (form.password) data.password = form.password;
        await usersApi.update(editUser.id, data);
      } else {
        await usersApi.create({
          username: form.username,
          password: form.password,
          role: form.role,
          permissions: form.permissions,
        } as any);
      }
      setShowModal(false);
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await usersApi.remove(id);
      load();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Cannot delete user');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleBadge = (role: string, isSuperuser?: boolean) => {
    if (isSuperuser) return <Badge bg="danger">Superuser</Badge>;
    switch (role) {
      case 'superadmin':
        return <Badge bg="danger">Superadmin</Badge>;
      case 'admin':
        return <Badge bg="warning" text="dark">Admin</Badge>;
      case 'operator':
        return <Badge bg="info">Operator</Badge>;
      default:
        return <Badge bg="secondary">Viewer</Badge>;
    }
  };

  const getPermissionBadge = (level: PermissionLevel) => {
    switch (level) {
      case 'edit':
        return <Badge bg="success">Edit</Badge>;
      case 'run':
        return <Badge bg="info">Run</Badge>;
      case 'view':
        return <Badge bg="secondary">View</Badge>;
      default:
        return <Badge bg="dark">None</Badge>;
    }
  };

  // Available roles for the current user to assign
  const availableRoles = isSuperadmin
    ? ['admin', 'operator', 'viewer']
    : ['operator', 'viewer'];

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-3">
        <Container>
          <Navbar.Brand as={Link} to="/">CS2 RCON Manager</Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar" />
          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/users" active>User Management</Nav.Link>
            </Nav>
            <Nav>
              <NavDropdown title={currentUser?.username || 'User'} align="end">
                <NavDropdown.Item disabled>
                  Role: {currentUser?.role}{currentUser?.isSuperuser ? ' (Superuser)' : ''}
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">User Management</h5>
            <Button variant="primary" size="sm" onClick={openAdd}>
              + Add User
            </Button>
          </Card.Header>
          <Card.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Servers</th>
                  <th>Maps</th>
                  <th>Prompts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.username}
                      {u.isSuperuser && <Badge bg="danger" className="ms-2">Protected</Badge>}
                    </td>
                    <td>{getRoleBadge(u.role, u.isSuperuser)}</td>
                    <td>{getPermissionBadge(u.permissions?.servers || 'view')}</td>
                    <td>{getPermissionBadge(u.permissions?.maps || 'view')}</td>
                    <td>{getPermissionBadge(u.permissions?.prompts || 'view')}</td>
                    <td>
                      {!u.isSuperuser && (
                        <>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-1"
                            onClick={() => openEdit(u)}
                          >
                            Edit
                          </Button>
                          {/* Admins can't delete other admins */}
                          {(isSuperadmin || (isAdmin && u.role !== 'admin')) && (
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => handleDelete(u.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Container>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editUser ? 'Edit User' : 'Add User'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter username"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</Form.Label>
            <Form.Control
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editUser ? 'Leave blank to keep current' : 'Enter password'}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Role</Form.Label>
            <Form.Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              {isSuperadmin
                ? 'Admins can manage users (except other admins). Operators can run commands. Viewers can only view.'
                : 'You can only create operators and viewers.'}
            </Form.Text>
          </Form.Group>

          <hr />
          <h6>Permissions</h6>
          <Form.Text className="text-muted d-block mb-3">
            For non-admin users, set specific permissions per resource.
          </Form.Text>

          <Form.Group className="mb-2">
            <Form.Label>Servers</Form.Label>
            <Form.Select
              value={form.permissions.servers}
              onChange={(e) =>
                setForm({
                  ...form,
                  permissions: { ...form.permissions, servers: e.target.value as PermissionLevel },
                })
              }
            >
              <option value="none">None</option>
              <option value="view">View Only</option>
              <option value="run">Run Commands</option>
              <option value="edit">Add/Edit/Delete</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Maps</Form.Label>
            <Form.Select
              value={form.permissions.maps}
              onChange={(e) =>
                setForm({
                  ...form,
                  permissions: { ...form.permissions, maps: e.target.value as PermissionLevel },
                })
              }
            >
              <option value="none">None</option>
              <option value="view">View Only</option>
              <option value="run">Change Map</option>
              <option value="edit">Add/Edit/Delete</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Prompts</Form.Label>
            <Form.Select
              value={form.permissions.prompts}
              onChange={(e) =>
                setForm({
                  ...form,
                  permissions: { ...form.permissions, prompts: e.target.value as PermissionLevel },
                })
              }
            >
              <option value="none">None</option>
              <option value="view">View Only</option>
              <option value="run">Run Prompts</option>
              <option value="edit">Add/Edit/Delete</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UserManager;
