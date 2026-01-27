'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Key, Trash2, Copy, Check, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

interface ApiKey {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
}

interface NewApiKey extends ApiKey {
  api_key: string
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<NewApiKey | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/auth/api-keys')
      const data = await res.json()
      setApiKeys(data)
    } catch (error) {
      console.error('Error fetching API keys:', error)
    }
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) return

    try {
      const res = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      
      const data = await res.json()
      setNewlyCreatedKey(data)
      setShowCreateModal(false)
      setNewKeyName('')
      fetchApiKeys()
    } catch (error) {
      console.error('Error creating API key:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return

    try {
      await fetch(`/api/auth/api-keys?id=${id}`, {
        method: 'DELETE',
      })
      fetchApiKeys()
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8" />
            API Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for MCP server and external integrations
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* Newly Created Key Display */}
      {newlyCreatedKey && (
        <Card className="border-green-500/30 bg-green-500/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              API Key Created Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-green-300">Your API Key (copy it now, it won't be shown again)</Label>
              <div className="flex gap-2">
                <Input
                  value={newlyCreatedKey.api_key}
                  readOnly
                  className="font-mono text-sm bg-background"
                />
                <Button
                  onClick={() => handleCopyKey(newlyCreatedKey.api_key)}
                  variant="outline"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                <p className="text-xs text-yellow-300">
                  Make sure to copy your API key now. You won't be able to see it again!
                  Add it to your MCP server configuration file.
                </p>
              </div>
            </div>
            <Button onClick={() => setNewlyCreatedKey(null)} variant="outline" size="sm">
              I've saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((key) => (
          <Card key={key.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{key.name}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Created: {format(new Date(key.created_at), 'MMM dd, yyyy')}</span>
                    {key.last_used_at ? (
                      <span>Last used: {format(new Date(key.last_used_at), 'MMM dd, yyyy HH:mm')}</span>
                    ) : (
                      <Badge variant="outline" className="text-xs">Never used</Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(key.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {apiKeys.length === 0 && !newlyCreatedKey && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <Key className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No API keys yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create an API key to use with the MCP server or external integrations
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First API Key
            </Button>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., MCP Server, Development, Production"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate()
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Give your API key a descriptive name to help you remember what it's for
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5" />
                <div className="text-xs text-blue-300 space-y-1">
                  <p>The API key will only be shown once after creation.</p>
                  <p>Make sure to copy it and store it securely.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newKeyName.trim()}>
                Create API Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-lg">Using API Keys with MCP Server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>To use an API key with the MCP server:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Create an API key above</li>
            <li>Copy the API key (shown only once)</li>
            <li>Add it to your MCP server configuration: <code className="bg-muted px-1 py-0.5 rounded">API_KEY=your_key_here</code></li>
            <li>Restart the MCP server</li>
          </ol>
          <p className="text-muted-foreground">
            In development mode, API keys are optional. Set <code className="bg-muted px-1 py-0.5 rounded">REQUIRE_AUTH=true</code> to enforce authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
