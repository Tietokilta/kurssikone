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
    <div className="my-6">
      <h4>Looks like this is your first time making a review!</h4>
      <p>An user ID has been generated for you.</p>
      <p>
        Your user ID is: <b>{generatedUserId}</b>
        <button
          className="ml-2 px-2 py-1 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
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
        className="my-2 px-3 py-1.5 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
        onClick={handleSettingNewUserId}
      >
        Understood, I have saved my user ID
      </button>

      <p className="mt-6">
        Alternatively, if you already have a previously saved user ID, paste it below and click
        submit.
      </p>
      {error && (
        <p>
          <b className="text-red-600">{error}</b>
        </p>
      )}
      <input
        type="text"
        placeholder="Paste your user ID here"
        className="min-w-[282px] max-w-[400px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        onChange={(e) => setPreviousUserId(e.target.value)}
      />
      <button
        className="ml-2 px-3 py-1.5 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
        onClick={handleSettingPreviousUserId}
      >
        Submit
      </button>
    </div>
  )
}

export default NewAccountNotification
