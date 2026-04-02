import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  updateLocalState: () => Promise<void>
  setIsMakingNewReview: (isMakingNewReview: boolean) => void
  setUserId: (userId: string) => void | Promise<void>
  getUser: (userId: string) => Promise<unknown>
  makeUser: (userId: string) => Promise<void>
}

const NewAccountNotification = ({
  updateLocalState,
  setIsMakingNewReview,
  setUserId,
  getUser,
  makeUser,
}: Props) => {
  const [generatedUserId] = useState<string>(uuidv4())
  const [previousUserId, setPreviousUserId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const handleSettingNewUserId = async () => {
    await makeUser(generatedUserId)
    await setUserId(generatedUserId)
    await updateLocalState()
  }

  const handleSettingPreviousUserId = async () => {
    const res = await getUser(previousUserId)

    if (!res) {
      setError('User ID not found')
      return
    }

    await setUserId(previousUserId)
    await updateLocalState()
    setIsMakingNewReview(false)
  }

  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <h4>Looks like this is your first time making a review!</h4>
      <p>An user ID has been generated for you.</p>
      <p>
        Your user ID is: <b>{generatedUserId}</b>
        <button
          className="btn btn-secondary btn-hollow btn-sm"
          style={{ marginLeft: 8 }}
          onClick={() => {
            navigator.clipboard.writeText(generatedUserId)
          }}
        >
          Copy
        </button>
      </p>
      <p>
        If you want to be able to edit your reviews from another browser, you should{' '}
        <b>save this ID somewhere safe.</b>
      </p>
      <button
        className="btn btn-secondary btn-hollow btn-sm"
        style={{ marginTop: 8, marginBottom: 8 }}
        onClick={handleSettingNewUserId}
      >
        Understood, I have saved my user ID
      </button>

      <p style={{ marginTop: 24 }}>
        Alternatively, if you already have a previously saved user ID, paste it below and click
        submit.
      </p>
      {error && (
        <p>
          <b style={{ color: 'red' }}>{error}</b>
        </p>
      )}
      <input
        type="text"
        placeholder="Paste your user ID here"
        style={{ minWidth: 282, maxWidth: 400 }}
        onChange={(e) => setPreviousUserId(e.target.value)}
      />
      <button
        className="btn btn-secondary btn-hollow btn-sm"
        style={{ marginLeft: 8 }}
        onClick={handleSettingPreviousUserId}
      >
        Submit
      </button>
    </div>
  )
}

export default NewAccountNotification
