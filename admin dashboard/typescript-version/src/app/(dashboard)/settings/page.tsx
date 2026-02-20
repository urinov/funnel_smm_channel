'use client'

import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import Divider from '@mui/material/Divider'
import { styled } from '@mui/material/styles'
import {
  Bot,
  Link2,
  DollarSign,
  Bell,
  Shield,
  Database,
  Save,
} from 'lucide-react'

import { Card, Button, Input, Tabs, TabPanel, useTabs } from '@/components/ui'

const SettingSection = styled(Box)(({ theme }) => ({
  marginBottom: 32,
}))

const SettingRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 0',
  borderBottom: `1px solid ${theme.palette.divider}`,

  '&:last-child': {
    borderBottom: 'none',
  },
}))

const SettingInfo = styled(Box)({
  flex: 1,
})

export default function SettingsPage() {
  const tabs = useTabs('general')
  const [settings, setSettings] = useState({
    botName: 'Funnel Bot',
    channelId: '-1001234567890',
    channelLink: 'https://t.me/+ABC123',
    subscriptionPrice: 99000,
    reminderEnabled: true,
    reminder10Days: true,
    reminder5Days: true,
    reminder3Days: true,
    reminder1Day: true,
    autoKick: true,
  })

  const handleSave = () => {
    console.log('Saving settings:', settings)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure your bot and channel settings
          </Typography>
        </Box>
        <Button variant="solid" colorScheme="primary" leftIcon={<Save size={18} />} onClick={handleSave}>
          Save Changes
        </Button>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} lg={8}>
          {/* Bot Settings */}
          <Card title="Bot Configuration" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Input
                label="Bot Name"
                value={settings.botName}
                onChange={(e) => setSettings({ ...settings, botName: e.target.value })}
                leftIcon={<Bot size={18} />}
              />
              <Input
                label="Premium Channel ID"
                value={settings.channelId}
                onChange={(e) => setSettings({ ...settings, channelId: e.target.value })}
                hint="The ID of your premium Telegram channel"
              />
              <Input
                label="Channel Invite Link"
                value={settings.channelLink}
                onChange={(e) => setSettings({ ...settings, channelLink: e.target.value })}
                leftIcon={<Link2 size={18} />}
              />
            </Box>
          </Card>

          {/* Subscription Settings */}
          <Card title="Subscription Settings" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Input
                label="Default Subscription Price (UZS)"
                type="number"
                value={settings.subscriptionPrice}
                onChange={(e) => setSettings({ ...settings, subscriptionPrice: Number(e.target.value) })}
                leftIcon={<DollarSign size={18} />}
              />
            </Box>
          </Card>

          {/* Reminder Settings */}
          <Card title="Subscription Reminders">
            <SettingRow>
              <SettingInfo>
                <Typography variant="body2" fontWeight={600}>
                  Enable Reminders
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Send automatic reminders before subscription expires
                </Typography>
              </SettingInfo>
              <Switch
                checked={settings.reminderEnabled}
                onChange={(e) => setSettings({ ...settings, reminderEnabled: e.target.checked })}
              />
            </SettingRow>

            {settings.reminderEnabled && (
              <>
                <SettingRow>
                  <SettingInfo>
                    <Typography variant="body2">10 days before expiry</Typography>
                  </SettingInfo>
                  <Switch
                    checked={settings.reminder10Days}
                    onChange={(e) => setSettings({ ...settings, reminder10Days: e.target.checked })}
                  />
                </SettingRow>
                <SettingRow>
                  <SettingInfo>
                    <Typography variant="body2">5 days before expiry</Typography>
                  </SettingInfo>
                  <Switch
                    checked={settings.reminder5Days}
                    onChange={(e) => setSettings({ ...settings, reminder5Days: e.target.checked })}
                  />
                </SettingRow>
                <SettingRow>
                  <SettingInfo>
                    <Typography variant="body2">3 days before expiry</Typography>
                  </SettingInfo>
                  <Switch
                    checked={settings.reminder3Days}
                    onChange={(e) => setSettings({ ...settings, reminder3Days: e.target.checked })}
                  />
                </SettingRow>
                <SettingRow>
                  <SettingInfo>
                    <Typography variant="body2">1 day before expiry</Typography>
                  </SettingInfo>
                  <Switch
                    checked={settings.reminder1Day}
                    onChange={(e) => setSettings({ ...settings, reminder1Day: e.target.checked })}
                  />
                </SettingRow>
              </>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          {/* Quick Actions */}
          <Card title="Quick Actions" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="outline" colorScheme="neutral" fullWidth>
                <Database size={18} style={{ marginRight: 8 }} />
                Export All Data
              </Button>
              <Button variant="outline" colorScheme="neutral" fullWidth>
                <Bell size={18} style={{ marginRight: 8 }} />
                Test Notifications
              </Button>
              <Button variant="outline" colorScheme="danger" fullWidth>
                <Shield size={18} style={{ marginRight: 8 }} />
                Security Settings
              </Button>
            </Box>
          </Card>

          {/* System Info */}
          <Card title="System Info">
            <SettingRow>
              <Typography variant="body2" color="text.secondary">Version</Typography>
              <Typography variant="body2" fontWeight={600}>2.0.0</Typography>
            </SettingRow>
            <SettingRow>
              <Typography variant="body2" color="text.secondary">Last Updated</Typography>
              <Typography variant="body2" fontWeight={600}>Feb 15, 2024</Typography>
            </SettingRow>
            <SettingRow>
              <Typography variant="body2" color="text.secondary">Database</Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">Connected</Typography>
            </SettingRow>
            <SettingRow>
              <Typography variant="body2" color="text.secondary">Bot Status</Typography>
              <Typography variant="body2" fontWeight={600} color="success.main">Running</Typography>
            </SettingRow>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
