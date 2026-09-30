import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { NewAccountNotification, ReviewMakeForm, type Review } from '@kurssikone/shared'
import {
  getUserReviewForCourse,
  getUser,
  makeUser,
  makeOrEditReview,
  deleteReview,
} from '../requestHandlers'
import { resolveCompletedCourse } from '../utils/recentAttainmentCourse'
import { getAnonymousReactorId, getUserIdFromStorage, setUserIdInStorageFunc } from './CoursePage'

type Props = {
  /** Resolves once Sisu has rendered the row's course name. */
  waitForRow: () => Promise<AttainmentRow>
  modalContainer: HTMLElement
}

type AttainmentRow = {
  /** e.g. `Programming Parallel Computers D, 5 cr, 31.5.2026` */
  description: string
  /** `d.m.yyyy` */
  date: string
}

type ResolvedCourse = { code: string; name: string }

type UserState = {
  userId: string | null
  /** Registered as the user ID if the user creates a new account. */
  generatedUserId: string
  userReview: Review | null
}

const ReviewForm = ({ courseCode, onClose }: { courseCode: string; onClose: () => void }) => {
  const { t } = useTranslation()
  const [user, setUser] = useState<UserState | null>(null)
  const [hasError, setHasError] = useState(false)

  const loadUser = async () => {
    const userId = await getUserIdFromStorage()
    const userReview = userId ? await getUserReviewForCourse(courseCode, userId) : null
    const generatedUserId = userId ?? (await getAnonymousReactorId())
    setUser({ userId, generatedUserId, userReview })
  }

  useEffect(() => {
    loadUser().catch((error) => {
      console.error('[KurssiKone] Failed to load review form data:', error)
      setHasError(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode])

  if (hasError) {
    return <p className="text-gray-600">{t('shared.genericError')}</p>
  }

  if (!user) {
    return <p className="text-gray-600">{t('shared.loading')}</p>
  }

  if (user.userId) {
    return (
      <ReviewMakeForm
        userId={user.userId}
        courseCode={courseCode}
        currentUserReview={user.userReview}
        // The modal closes after saving, so there is nothing to refetch
        refetchUserReview={async () => {}}
        refetchAverages={async () => {}}
        setIsMakingNewReview={(value) => {
          if (!value) onClose()
        }}
        makeOrEditReview={makeOrEditReview}
        deleteReview={deleteReview}
      />
    )
  }

  return (
    <NewAccountNotification
      generatedUserId={user.generatedUserId}
      updateLocalState={loadUser}
      // Switching to an existing user ID should continue to the form, not close the modal
      setIsMakingNewReview={() => {}}
      setUserId={setUserIdInStorageFunc}
      getUser={getUser}
      makeUser={makeUser}
    />
  )
}

const ReviewModal = ({ course, onClose }: { course: ResolvedCourse; onClose: () => void }) => {
  const { t } = useTranslation()
  const isDirty = useRef(false)

  // Closing by hand asks before discarding anything the user has typed
  const requestClose = () => {
    if (!isDirty.current || window.confirm(t('extension.confirmDiscardReview'))) onClose()
  }
  const requestCloseRef = useRef(requestClose)
  requestCloseRef.current = requestClose

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[820px] max-h-[90vh] overflow-y-auto rounded bg-white px-6 py-4 text-left shadow-xl"
        onInput={() => {
          isDirty.current = true
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-medium">
            <img src={chrome.runtime.getURL('icon16.png')} width={20} height={20} alt="" />
            {course.code} {course.name}
          </h2>
          <button className="btn-secondary" onClick={requestClose}>
            {t('extension.close')}
          </button>
        </div>
        <ReviewForm courseCode={course.code} onClose={onClose} />
      </div>
    </div>
  )
}

const RecentAttainmentReview = ({ waitForRow, modalContainer }: Props) => {
  const { t } = useTranslation()
  // Stays null, hiding the button, if the row can't be matched to a course
  const [course, setCourse] = useState<ResolvedCourse | null>(null)
  const [hasReview, setHasReview] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Rechecked when the modal closes, as a review may have just been published
    if (isOpen) return
    let cancelled = false
    const check = async () => {
      const row = await waitForRow()
      const [resolved, userId] = await Promise.all([
        resolveCompletedCourse(row.description, row.date),
        getUserIdFromStorage(),
      ])
      if (!resolved) return
      // A failed lookup shouldn't hide the button, so it falls back to "Write a Review"
      const reviewed = userId
        ? await getUserReviewForCourse(resolved.code, userId).then(
            (review) => review !== null,
            () => false
          )
        : false
      if (cancelled) return
      setHasReview(reviewed)
      setCourse(resolved)
    }
    check().catch((error) => {
      console.error('[KurssiKone] Failed to set up review button:', error)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!course) return null

  return (
    // The button sits inside Sisu's row button, so clicks must not reach it
    <div className="ml-2" onClick={(e) => e.stopPropagation()}>
      <button
        className={`${hasReview ? 'btn-secondary opacity-70' : 'btn-primary'} inline-flex items-center gap-1 px-2 py-0.5 text-xs`}
        onClick={() => setIsOpen(true)}
      >
        <img src={chrome.runtime.getURL('icon16.png')} width={14} height={14} alt="" />
        {hasReview ? t('extension.alreadyReviewed') : t('extension.writeReview')}
      </button>
      {isOpen &&
        createPortal(
          <ReviewModal course={course} onClose={() => setIsOpen(false)} />,
          modalContainer
        )}
    </div>
  )
}

export default RecentAttainmentReview
