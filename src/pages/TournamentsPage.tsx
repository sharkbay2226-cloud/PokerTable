import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Modal, Form, Input, Select, InputNumber, Button, Space, Typography, Popconfirm, Tag, Tabs, Row, Col, Checkbox, Radio } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, TrophyOutlined, ArrowLeftOutlined, StarOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import PokerEmpty from '../components/PokerEmpty';
import { getAllRooms, addRoom, updateRoom, deleteRoom, getAllTournaments, addTournament, updateTournament, deleteTournament, getCustomTournamentTypes, addCustomTournamentType, deleteCustomTournamentType } from '../db/db';
import type { Room, Tournament, Currency } from '../types';
import { TOURNAMENT_TYPES } from '../types';
import { PRESET_ROOMS } from '../data/presetRooms';
import type { PresetRoom, PresetTournament } from '../data/presetRooms';

const { Title, Text } = Typography;

export default function TournamentsPage() {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tournaments, setTournaments] = useState<(Tournament & { roomName?: string })[]>([]);
  const [roomModal, setRoomModal] = useState(false);
  const [tourModal, setTourModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingTour, setEditingTour] = useState<Tournament | null>(null);
  const [roomForm] = Form.useForm();
  const [tourForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('rooms');
  const [helpOpen, setHelpOpen] = useState(false);
  const [filterRoomId, setFilterRoomId] = useState<string | undefined>(undefined);
  const [selectedPreset, setSelectedPreset] = useState<PresetRoom | null>(null);
  const [checkedTournaments, setCheckedTournaments] = useState<PresetTournament[]>([]);
  const [customTourType, setCustomTourType] = useState('');
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false);
  const [customTypes, setCustomTypes] = useState<{ id: number; name: string }[]>([]);

  const load = async () => {
    const [roomList, tourList, ct] = await Promise.all([
      getAllRooms(),
      getAllTournaments(),
      getCustomTournamentTypes().catch(() => [] as { id: number; name: string }[]),
    ]);
    const enriched = tourList.map((t) => ({ ...t, roomName: roomList.find((r) => r.id === t.roomId)?.name ?? '—' }));
    setRooms(roomList);
    setTournaments(enriched);
    setCustomTypes(ct);
  };

  useEffect(() => { load(); }, []);

  const sortedRooms = useMemo(() => [...rooms].sort((a, b) => a.name.localeCompare(b.name)), [rooms]);

  // Room handlers
  const handleAddRoom = async (values: { name: string; defaultCurrency?: Currency }) => {
    setLoading(true);
    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, values.name);
      } else {
        const roomId = await addRoom(values.name, values.defaultCurrency);
        for (const t of checkedTournaments) {
          await addTournament({ name: t.name, roomId, buyIn: t.buyIn, currency: t.currency });
        }
      }
      roomForm.resetFields();
      setEditingRoom(null);
      setRoomModal(false);
      setSelectedPreset(null);
      setCheckedTournaments([]);
      await load();
    } finally { setLoading(false); }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    roomForm.setFieldsValue({ name: room.name });
    setRoomModal(true);
  };

  const handleDeleteRoom = async (id: string) => {
    await deleteRoom(id);
    if (filterRoomId === id) setFilterRoomId(undefined);
    await load();
  };

  const openAddRoom = () => {
    setEditingRoom(null);
    roomForm.resetFields();
    setSelectedPreset(null);
    setCheckedTournaments([]);
    setRoomModal(true);
  };

  const handlePresetChange = (value: string | undefined) => {
    if (!value) {
      setSelectedPreset(null);
      setCheckedTournaments([]);
      roomForm.setFieldsValue({ name: '' });
      return;
    }
    const preset = PRESET_ROOMS.find((r) => r.name === value) || null;
    setSelectedPreset(preset);
    setCheckedTournaments([]);
    if (preset) roomForm.setFieldsValue({ name: preset.name });
  };

  // Tournament handlers
  const handleAddTour = async (values: { name: string; roomId: string; buyIn: number; currency: Currency; color?: string; type?: string }) => {
    setLoading(true);
    try {
      let type = values.type === '__custom__' ? customTourType : values.type;
      if (type && !TOURNAMENT_TYPES.includes(type) && !customTypes.some((ct) => ct.name === type)) {
        await addCustomTournamentType(type).catch(() => {});
      }
      if (editingTour) {
        await updateTournament(editingTour.id, { ...values, type });
      } else {
        await addTournament({ ...values, type });
      }
      tourForm.resetFields();
      setEditingTour(null);
      setTourModal(false);
      setCustomTourType('');
      setShowCustomTypeInput(false);
      await load();
    } catch (e) {
      console.error('Failed to save tournament', e);
    } finally { setLoading(false); }
  };

  const handleEditTour = (tour: Tournament) => {
    setEditingTour(tour);
    const isCustom = tour.type && !TOURNAMENT_TYPES.includes(tour.type);
    tourForm.setFieldsValue({ name: tour.name, roomId: tour.roomId, buyIn: tour.buyIn, currency: tour.currency, color: tour.color || undefined, type: isCustom ? '__custom__' : (tour.type || undefined) });
    if (isCustom) { setCustomTourType(tour.type!); setShowCustomTypeInput(true); }
    setTourModal(true);
  };

  const handleDeleteTour = async (id: string) => {
    await deleteTournament(id);
    await load();
  };

  const openAddTour = () => {
    setEditingTour(null);
    tourForm.resetFields();
    setShowCustomTypeInput(false);
    if (filterRoomId) {
      tourForm.setFieldsValue({ roomId: filterRoomId });
    }
    setTourModal(true);
  };

  const roomColumns = [
    { title: t('tournaments.columns.name'), dataIndex: 'name', key: 'name', sorter: (a: Room, b: Room) => a.name.localeCompare(b.name) },
    {
      title: t('tournaments.columns.tournamentCount'),
      key: 'count',
      render: (_: unknown, record: Room) => {
        const cnt = tournaments.filter((t) => t.roomId === record.id).length;
        return (
          <Tag
            style={{ cursor: 'pointer' }}
            onClick={() => { setFilterRoomId(record.id); setTab('tournaments'); }}
          >
            {cnt}
          </Tag>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Room) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditRoom(record)} />
          <Popconfirm title={t('tournaments.delete.roomConfirm')} onConfirm={() => handleDeleteRoom(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tourColumns = [
    { title: '', key: 'color', width: 30, render: (_: unknown, record: any) => record.color ? <div style={{ width: 12, height: 12, borderRadius: '50%', background: record.color, display: 'inline-block' }} /> : null },
    { title: t('tournaments.columns.name'), dataIndex: 'name', key: 'name' },
    { title: t('tournaments.columns.buyIn'), key: 'buyIn', render: (_: unknown, record: any) => `${record.buyIn} ${record.currency}` },
    { title: 'Тип', key: 'type', render: (_: unknown, record: any) => record.type ? <span style={{ color: 'var(--color-accent)' }}>{record.type}</span> : '—' },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Tournament) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditTour(record)} />
          <Popconfirm title={t('tournaments.delete.tournamentConfirm')} onConfirm={() => handleDeleteTour(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>{t('tournaments.page.title')}</Title>
          <Button type="text" icon={<QuestionCircleOutlined style={{ color: 'var(--color-accent)', fontSize: 18 }} />} onClick={() => setHelpOpen(true)} />
        </Space>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'rooms',
          label: <span><SettingOutlined /> {t('tournaments.tabs.rooms')}</span>,
          children: (
            <Card
              extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAddRoom}>{t('tournaments.page.addRoom')}</Button>}
            >
              <Table dataSource={sortedRooms} columns={roomColumns} rowKey="id" pagination={false} locale={{ emptyText: <PokerEmpty description={t('tournaments.page.noRooms')} /> }} />
            </Card>
          ),
        },
        {
          key: 'tournaments',
          label: <span><TrophyOutlined /> {t('tournaments.tabs.tournaments')}</span>,
          children: (
            <Card
              extra={filterRoomId ? (
                <Space>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => setFilterRoomId(undefined)}>{t('tournaments.page.back')}</Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={openAddTour}>{t('tournaments.page.addTournament')}</Button>
                </Space>
              ) : (
                <Button type="primary" icon={<PlusOutlined />} onClick={openAddTour}>{t('tournaments.page.addTournament')}</Button>
              )}
            >
              {filterRoomId ? (
                (() => {
                  const room = rooms.find((r) => r.id === filterRoomId);
                  const tours = tournaments
                    .filter((t) => t.roomId === filterRoomId)
                    .sort((a, b) => a.name.localeCompare(b.name));
                  return tours.length > 0 ? (
                    <>
                      <Text strong style={{ color: 'var(--color-accent)', fontSize: 16, display: 'block', marginBottom: 12 }}>
                        {t('tournaments.page.roomCount', { room: room?.name, count: tours.length })}
                      </Text>
                      <Table
                        dataSource={tours}
                        rowKey="id"
                        pagination={false}
                        locale={{ triggerDesc: t('tournaments.table.triggerDesc'), triggerAsc: t('tournaments.table.triggerAsc'), cancelSort: t('tournaments.table.cancelSort') }}
                        columns={[
                          { title: '', key: 'color', width: 30, render: (_: unknown, record: any) => record.color ? <div style={{ width: 12, height: 12, borderRadius: '50%', background: record.color, display: 'inline-block' }} /> : null },
                          { title: t('tournaments.columns.name'), dataIndex: 'name', key: 'name', sorter: (a: any, b: any) => a.name.localeCompare(b.name) },
                          { title: t('tournaments.columns.buyIn'), key: 'buyIn', sorter: (a: any, b: any) => a.buyIn - b.buyIn, render: (_: unknown, record: any) => `${record.buyIn} ${record.currency}` },
                          { title: 'Тип', key: 'type', render: (_: unknown, record: any) => record.type ? <span style={{ color: 'var(--color-accent)' }}>{record.type}</span> : '—' },
                          {
                            title: '',
                            key: 'actions',
                            width: 100,
                            render: (_: unknown, record: Tournament) => (
                              <Space>
                                <Button type="link" icon={<EditOutlined />} onClick={() => handleEditTour(record)} />
                                <Popconfirm title={t('tournaments.delete.tournamentConfirm')} onConfirm={() => handleDeleteTour(record.id)}>
                                  <Button type="link" danger icon={<DeleteOutlined />} />
                                </Popconfirm>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </>
                  ) : (
                    <PokerEmpty description={t('tournaments.empty', { room: room?.name })} icon="trophy" />
                  );
                })()
              ) : (
                <Row gutter={[16, 16]}>
                  {sortedRooms.map((room) => {
                    const cnt = tournaments.filter((t) => t.roomId === room.id).length;
                    return (
                      <Col key={room.id} xs={24} sm={12} md={8} lg={6}>
                        <Card
                          hoverable
                          onClick={() => setFilterRoomId(room.id)}
                           style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                          <Text strong style={{ fontSize: 16, color: '#3b82f6' }}>{room.name}</Text>
                          <br />
                          <Tag style={{ marginTop: 8 }}>{t('tournaments.count', { count: cnt })}</Tag>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Card>
          ),
        },
      ]} />

      {/* Room Modal */}
      <Modal title={editingRoom ? t('tournaments.roomModal.editTitle') : t('tournaments.roomModal.newTitle')} open={roomModal} onCancel={() => { setRoomModal(false); setEditingRoom(null); setSelectedPreset(null); setCheckedTournaments([]); }} footer={null}>
        {!editingRoom && (
          <>
            <div style={{ padding: 12, background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, marginBottom: 4 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6' }}>
                  <StarOutlined style={{ color: 'var(--color-accent)' }} /> {t('tournaments.presetRooms.quickSelect')}
                </Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder={t('tournaments.presetRooms.selectPlaceholder')}
                  allowClear
                  showSearch
                  value={selectedPreset?.name || undefined}
                  onChange={handlePresetChange}
                  filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
                  options={PRESET_ROOMS.map((r) => ({ value: r.name, label: r.name }))}
                />
                {selectedPreset && selectedPreset.tournaments.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t('tournaments.presetRooms.tournaments')}</Text>
                    <Checkbox.Group
                      value={checkedTournaments.map((t) => t.name)}
                      onChange={(checked) => {
                        setCheckedTournaments(selectedPreset.tournaments.filter((t) => checked.includes(t.name)));
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
                    >
                      {selectedPreset.tournaments.map((t) => (
                        <Checkbox key={t.name} value={t.name} style={{ fontSize: 12 }}>
                          {t.name} ({t.buyIn} {t.currency})
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  </div>
                )}
              </Space>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#334155' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>— {t('tournaments.presetRooms.orCustom')} —</Text>
              <div style={{ flex: 1, height: 1, background: '#334155' }} />
            </div>
          </>
        )}
        <Form form={roomForm} layout="vertical" onFinish={handleAddRoom}>
          <Form.Item name="name" label={t('tournaments.roomModal.nameLabel')} rules={[
            { required: true, message: t('tournaments.roomModal.nameRequired') },
            { validator: (_, value) => {
              if (!value || (editingRoom && editingRoom.name.toLowerCase() === value.toLowerCase())) return Promise.resolve();
              if (rooms.some((r) => r.name.toLowerCase() === value.toLowerCase())) {
                return Promise.reject(new Error(t('tournaments.roomModal.nameDuplicate')));
              }
              return Promise.resolve();
            }},
          ]}>
            <Input placeholder={t('tournaments.roomModal.namePlaceholder')} />
          </Form.Item>
          {!editingRoom && (
            <Form.Item name="defaultCurrency" label={t('tournaments.roomModal.currencyLabel')} initialValue="USD">
              <Select
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'RUB', label: 'RUB' },
                ]}
              />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>{editingRoom ? t('tournaments.roomModal.save') : t('tournaments.roomModal.add')}</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Tournament Modal */}
      <Modal title={editingTour ? t('tournaments.tournamentModal.editTitle') : t('tournaments.tournamentModal.newTitle')} open={tourModal} onCancel={() => { setTourModal(false); setEditingTour(null); setCustomTourType(''); setShowCustomTypeInput(false); }} footer={null}>
        <Form form={tourForm} layout="vertical" onFinish={handleAddTour}>
          <Form.Item name="name" label={t('tournaments.tournamentModal.nameLabel')} rules={[
            { required: true, message: t('tournaments.tournamentModal.nameRequired') },
            { validator: (_, value) => {
              if (!value) return Promise.resolve();
              const roomId = tourForm.getFieldValue('roomId');
              if (!roomId) return Promise.resolve();
              const same = tournaments.find((t) =>
                t.name.toLowerCase() === value.toLowerCase() &&
                t.roomId === roomId &&
                (!editingTour || editingTour.id !== t.id)
              );
              if (same) return Promise.reject(new Error(t('tournaments.tournamentModal.nameDuplicate')));
              return Promise.resolve();
            }},
          ]}>
            <Input placeholder={t('tournaments.tournamentModal.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="roomId" label={t('tournaments.tournamentModal.roomLabel')} rules={[{ required: true, message: t('tournaments.tournamentModal.roomRequired') }]}>
            <Select placeholder={t('tournaments.tournamentModal.roomRequired')} showSearch optionFilterProp="label">
              {sortedRooms.map((r) => (
                <Select.Option key={r.id} value={r.id} label={r.name}>{r.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Space align="start" size={16} wrap>
            <Form.Item name="buyIn" label={t('tournaments.tournamentModal.buyInLabel')} rules={[{ required: true, message: t('tournaments.tournamentModal.buyInRequired') }]}>
              <InputNumber min={0} placeholder="0" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="currency" label={t('tournaments.tournamentModal.currencyLabel')} rules={[{ required: true, message: t('tournaments.tournamentModal.currencyRequired') }]}>
              <Select style={{ width: 100 }}>
                <Select.Option value="USD">USD</Select.Option>
                <Select.Option value="RUB">RUB</Select.Option>
                <Select.Option value="EUR">EUR</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="color" label={t('tournaments.colors.label')} style={{ marginTop: 4 }}>
            <Radio.Group>
              <Space>
                <Radio.Button value={undefined} style={{ padding: '0 8px' }}>{t('tournaments.colors.none')}</Radio.Button>
                <Radio.Button value="#ef4444" style={{ padding: '0 8px', borderLeft: '3px solid #ef4444' }}>{t('tournaments.colors.red')}</Radio.Button>
                <Radio.Button value="#eab308" style={{ padding: '0 8px', borderLeft: '3px solid #eab308' }}>{t('tournaments.colors.yellow')}</Radio.Button>
                <Radio.Button value="#22c55e" style={{ padding: '0 8px', borderLeft: '3px solid #22c55e' }}>{t('tournaments.colors.green')}</Radio.Button>
                <Radio.Button value="#3b82f6" style={{ padding: '0 8px', borderLeft: '3px solid #3b82f6' }}>{t('tournaments.colors.blue')}</Radio.Button>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="type" label="Тип">
            <Select
              placeholder="Выберите тип"
              allowClear
              style={{ width: 250 }}
              onChange={(v) => { setShowCustomTypeInput(v === '__custom__'); if (v !== '__custom__') setCustomTourType(''); }}
            >
              <Select.OptGroup label="Базовые">
                {TOURNAMENT_TYPES.map((t) => (
                  <Select.Option key={t} value={t}>{t}</Select.Option>
                ))}
              </Select.OptGroup>
              {customTypes.length > 0 && (
                <Select.OptGroup label="Свои">
                  {customTypes.map((ct) => (
                    <Select.Option key={ct.name} value={ct.name}>
                      <Space>
                        <span>{ct.name}</span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            deleteCustomTournamentType(ct.id).then(() => load());
                          }}
                          style={{ fontSize: 11, height: 20, width: 20 }}
                        />
                      </Space>
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              )}
              <Select.Option value="__custom__">✏️ Свой тип...</Select.Option>
            </Select>
          </Form.Item>
          {showCustomTypeInput && (
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="Введите свой тип турнира"
                value={customTourType}
                onChange={(e) => setCustomTourType(e.target.value)}
                style={{ maxWidth: 250 }}
              />
            </div>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>{editingTour ? t('tournaments.tournamentModal.save') : t('tournaments.tournamentModal.add')}</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={<span style={{ color: 'var(--color-accent)' }}>{t('tournaments.help.title')}</span>} open={helpOpen} onCancel={() => setHelpOpen(false)} footer={null} width={520}>
        <Typography.Paragraph>{t('tournaments.help.intro')}</Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('tournaments.help.rooms')}</span><br />
          {t('tournaments.help.roomsDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('tournaments.help.tournaments')}</span><br />
          {t('tournaments.help.tournamentsDesc')}
        </Typography.Paragraph>
        <Typography.Paragraph>
          <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{t('tournaments.help.types')}</span><br />
          {t('tournaments.help.typesDesc')}
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
