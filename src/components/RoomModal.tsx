import { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, List, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAllRooms, addRoom, updateRoom, deleteRoom } from '../db/db';
import type { Room } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RoomModal({ open, onClose }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await getAllRooms();
    setRooms(data);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleSubmit = async (values: { name: string }) => {
    setLoading(true);
    try {
      if (editingId) {
        await updateRoom(editingId, values.name);
      } else {
        await addRoom(values.name);
      }
      form.resetFields();
      setEditingId(null);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingId(room.id);
    form.setFieldsValue({ name: room.name });
  };

  const handleDelete = async (id: string) => {
    await deleteRoom(id);
    await load();
  };

  const handleCancel = () => {
    form.resetFields();
    setEditingId(null);
    onClose();
  };

  return (
    <Modal title="Управление покер-румами" open={open} onCancel={handleCancel} footer={null} width={500}>
      <Form form={form} layout="inline" onFinish={handleSubmit} style={{ marginBottom: 16 }}>
        <Form.Item name="name" rules={[{ required: true, message: 'Введите название рума' }]}>
          <Input placeholder="Название рума" style={{ width: 250 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<PlusOutlined />}>
            {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </Form.Item>
        {editingId && (
          <Form.Item>
            <Button onClick={() => { setEditingId(null); form.resetFields(); }}>Отмена</Button>
          </Form.Item>
        )}
      </Form>
      <List
        dataSource={rooms}
        renderItem={(room) => (
          <List.Item
            actions={[
              <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => handleEdit(room)} />,
              <Popconfirm key="del" title="Удалить рум и все его турниры?" onConfirm={() => handleDelete(room.id)}>
                <Button type="link" danger icon={<DeleteOutlined />} />
              </Popconfirm>,
            ]}
          >
            {room.name}
          </List.Item>
        )}
      />
    </Modal>
  );
}
