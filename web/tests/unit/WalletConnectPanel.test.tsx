import { act } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WalletConnectPanel } from '@/features/wallet/WalletConnectPanel'
import { useWalletStore } from '@/features/wallet/walletStore'

afterEach(() => {
  useWalletStore.getState().disconnect()
})

describe('WalletConnectPanel', () => {
  it('hydrates an empty server snapshot before revealing browser wallets', async () => {
    const wallet = { name: 'Ready', icon: '' }
    const serverWallets: readonly unknown[] = []
    const browserWallets: readonly unknown[] = [wallet]
    const serverDiscovery = {
      getWallets: () => serverWallets,
      subscribe: () => () => undefined,
    }
    const browserDiscovery = {
      getWallets: () => browserWallets,
      subscribe: () => () => undefined,
    }
    const createDiscovery = vi.fn().mockReturnValue(browserDiscovery).mockReturnValueOnce(serverDiscovery)
    const props = {
      createDiscovery,
      provider: {},
      connect: vi.fn(),
      onConnected: vi.fn(),
    }
    const container = document.createElement('div')
    container.innerHTML = renderToString(<WalletConnectPanel {...props} />)
    document.body.append(container)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let root: Root | undefined

    try {
      await act(async () => {
        root = hydrateRoot(container, <WalletConnectPanel {...props} />)
      })
      await waitFor(() => expect(within(container).getByRole('button', { name: 'Ready' })).toBeInTheDocument())

      const errors = consoleError.mock.calls.flat().join(' ')
      expect(errors).not.toContain('Hydration failed')
    } finally {
      if (root) await act(async () => root?.unmount())
      consoleError.mockRestore()
      container.remove()
    }
  })

  it('discovers a wallet and exposes only its public connection state', async () => {
    const user = userEvent.setup()
    const wallet = { name: 'Ready', icon: 'data:image/svg+xml;base64,AA==' }
    const unsubscribe = vi.fn()
    const discovery = {
      getWallets: () => [wallet],
      subscribe: vi.fn(() => unsubscribe),
    }
    const walletAccount = { strk20PrepareInvoke: vi.fn(), strk20InvokeTransaction: vi.fn() }
    const connection = {
      account: walletAccount,
      address: '0x123' as const,
      chainId: '0x534e5f5345504f4c4941',
      walletApiVersions: ['0.10.3'],
      supportsStrk20: true,
    }
    const connect = vi.fn().mockResolvedValue(connection)
    const onConnected = vi.fn()

    const provider = { network: 'sepolia' }

    const { unmount } = render(
      <WalletConnectPanel
        createDiscovery={() => discovery}
        provider={provider}
        connect={connect}
        onConnected={onConnected}
      />,
    )

    await user.click(await screen.findByRole('button', { name: /Ready/ }))

    expect(connect).toHaveBeenCalledWith(wallet, provider)
    expect(onConnected).toHaveBeenCalledWith()
    expect(walletAccount.strk20PrepareInvoke).not.toHaveBeenCalled()
    expect(walletAccount.strk20InvokeTransaction).not.toHaveBeenCalled()
    expect(useWalletStore.getState()).toMatchObject({
      status: 'connected',
      address: '0x123',
      chainId: '0x534e5f5345504f4c4941',
      supportsStrk20: true,
    })
    expect(screen.getByText('0x123')).toBeInTheDocument()
    expect(JSON.stringify(useWalletStore.getState())).not.toContain('strk20PrepareInvoke')

    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('fails closed when the selected wallet lacks STRK20 support', async () => {
    const user = userEvent.setup()
    const wallet = { name: 'Public Wallet', icon: '' }
    const discovery = {
      getWallets: () => [wallet],
      subscribe: () => () => undefined,
    }
    const connect = vi.fn().mockResolvedValue({
      account: {},
      address: '0x456',
      chainId: '0x534e5f5345504f4c4941',
      walletApiVersions: ['0.10.2'],
      supportsStrk20: false,
    })

    render(
      <WalletConnectPanel createDiscovery={() => discovery} provider={{}} connect={connect} onConnected={vi.fn()} />,
    )

    await user.click(await screen.findByRole('button', { name: /Public Wallet/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wallet API 0.10.3')
    expect(useWalletStore.getState().status).toBe('error')
  })
})
