import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { NewAccountNotification, ReviewMakeForm, useCoursePageData } from '@kurssikone/shared'
import {
  getAveragesForCourse,
  getReviewsForCourseExcludingUserReview,
  getUserReviewForCourse,
  getUser,
  makeUser,
  makeOrEditReview,
  deleteReview,
} from '../requestHandlers'
import { resolveCompletedCourse } from '../utils/recentAttainmentCourse'
import { getAnonymousReactorId, getUserIdFromStorage, setUserIdInStorageFunc } from './CoursePage'

type Props = {
  /** Resolves with the widget row once Sisu has rendered its course name. */
  waitForRow: () => Promise<AttainmentRow>
  /** Element outside Sisu's layout that the modal is rendered into. */
  modalContainer: HTMLElement
}

type AttainmentRow = {
  /** Row text from the widget, e.g. `Programming Parallel Computers D, 5 cr, 31.5.2026`. */
  description: string
  /** Completion date as shown in the widget (`d.m.yyyy`). */
  date: string
}

type ResolvedCourse = { code: string; name: string }

const ReviewForm = ({ courseCode, onClose }: { courseCode: string; onClose: () => void }) => {
  const { t } = useTranslation()
  const {
    userId,
    reactorId,
    isLoading,
    hasError,
    userReview,
    fetchAndSetUserReview,
    fetchAndSetAverages,
    refetchData,
    setUserIdInStorage,
  } = useCoursePageData({
    courseCode,
    api: {
      getAveragesForCourse,
      getReviewsForCourseExcludingUserReview,
      getUserReviewForCourse,
    },
    storage: {
      getUserId: getUserIdFromStorage,
      setUserId: setUserIdInStorageFunc,
      getAnonymousReactorId,
    },
  })

  const setIsMakingNewReview = (value: boolean) => {
    if (!value) onClose()
  }

  if (hasError) {
    return <p className="text-gray-600">{t('shared.genericError')}</p>
  }

  if (isLoading) {
    return <p className="text-gray-600">{t('shared.loading')}</p>
  }

  if (userId) {
    return (
      <ReviewMakeForm
        userId={userId}
        courseCode={courseCode}
        currentUserReview={userReview}
        refetchUserReview={fetchAndSetUserReview}
        refetchAverages={fetchAndSetAverages}
        setIsMakingNewReview={setIsMakingNewReview}
        makeOrEditReview={makeOrEditReview}
        deleteReview={deleteReview}
      />
    )
  }

  if (!reactorId) return null

  return (
    <NewAccountNotification
      generatedUserId={reactorId}
      updateLocalState={refetchData}
      // Switching to an existing user ID should continue to the form, not close the modal
      setIsMakingNewReview={() => {}}
      setUserId={setUserIdInStorage}
      getUser={getUser}
      makeUser={makeUser}
    />
  )
}

const ReviewModal = ({ description, date, onClose }: AttainmentRow & { onClose: () => void }) => {
  const { t } = useTranslation()
  const [course, setCourse] = useState<ResolvedCourse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    resolveCompletedCourse(description, date)
      .then((resolved) => {
        if (cancelled) return
        setCourse(resolved)
        setStatus(resolved ? 'ready' : 'notFound')
      })
      .catch((error) => {
        console.error('[KurssiKone] Failed to resolve completed course:', error)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [description, date])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[820px] max-h-[90vh] overflow-y-auto rounded bg-white px-6 py-4 text-left shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-medium">
            <img src={chrome.runtime.getURL('icon16.png')} width={20} height={20} alt="" />
            {course ? `${course.code} ${course.name}` : description.split(',')[0]}
          </h2>
          <button className="btn-secondary" onClick={onClose}>
            {t('extension.close')}
          </button>
        </div>
        {status === 'loading' && <p className="text-gray-600">{t('shared.loading')}</p>}
        {status === 'notFound' && (
          <p className="text-gray-600">{t('extension.courseCodeNotFound')}</p>
        )}
        {status === 'error' && <p className="text-gray-600">{t('shared.genericError')}</p>}
        {course && <ReviewForm courseCode={course.code} onClose={onClose} />}
      </div>
    </div>
  )
}

const RecentAttainmentReview = ({ waitForRow, modalContainer }: Props) => {
  const { t } = useTranslation()
  const [row, setRow] = useState<AttainmentRow | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  // null until it's known whether the user has already reviewed the course
  const [hasReview, setHasReview] = useState<boolean | null>(null)

  useEffect(() => {
    // Rechecked when the modal closes, as a review may have just been published
    if (isOpen) return
    let cancelled = false
    const check = async () => {
      const loadedRow = await waitForRow()
      if (cancelled) return
      setRow(loadedRow)
      const [course, userId] = await Promise.all([
        resolveCompletedCourse(loadedRow.description, loadedRow.date),
        getUserIdFromStorage(),
      ])
      if (!course || !userId) return false
      return (await getUserReviewForCourse(course.code, userId)) !== null
    }
    check()
      .catch((error) => {
        console.error('[KurssiKone] Failed to check for an existing review:', error)
        return false
      })
      .then((reviewed) => {
        if (!cancelled && reviewed !== undefined) setHasReview(reviewed)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!row || (!isOpen && hasReview !== false)) return null

  return (
    // The button sits inside Sisu's row button, so clicks must not reach it
    <div className="ml-2" onClick={(e) => e.stopPropagation()}>
      <button
        className="btn-primary inline-flex items-center gap-1 px-2 py-0.5 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <img src={chrome.runtime.getURL('icon16.png')} width={14} height={14} alt="" />
        {t('extension.writeReview')}
      </button>
      {isOpen &&
        createPortal(
          <ReviewModal
            description={row.description}
            date={row.date}
            onClose={() => setIsOpen(false)}
          />,
          modalContainer
        )}
    </div>
  )
}

export default RecentAttainmentReview
