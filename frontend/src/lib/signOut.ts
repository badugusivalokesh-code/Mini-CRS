type Navigate = (to: string, options: { replace: boolean }) => void

export async function signOutAndNavigate(
  logout: () => Promise<void>,
  navigate: Navigate,
): Promise<void> {
  await logout()
  navigate('/', { replace: true })
}
