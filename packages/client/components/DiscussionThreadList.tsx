import graphql from 'babel-plugin-relay/macro'
import React, {forwardRef, RefObject} from 'react'
import {createFragmentContainer} from 'react-relay'
import {DiscussionThreadList_meeting} from '~/__generated__/DiscussionThreadList_meeting.graphql'
import {DiscussionThreadList_threadables} from '~/__generated__/DiscussionThreadList_threadables.graphql'
import useScrollThreadList from '~/hooks/useScrollThreadList'

import styled from '@emotion/styled'

import {PALETTE} from '../styles/paletteV2'
import CommentingStatusText from './CommentingStatusText'
import DiscussionThreadListEmptyState from './DiscussionThreadListEmptyState'
import LabelHeading from './LabelHeading/LabelHeading'
import ThreadedItem from './ThreadedItem'
import {MeetingTypeEnum} from '~/types/graphql'
import Avatar from './Avatar/Avatar'

const EmptyWrapper = styled('div')<{isPokerMeeting?: boolean}>(({isPokerMeeting}) => ({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  height: '100%',
  padding: isPokerMeeting ? '0' : '8px 0'
}))

const Wrapper = styled('div')<{isPokerMeeting?: boolean}>(({isPokerMeeting}) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  padding: isPokerMeeting ? '0' : '8px 0'
}))

// https://stackoverflow.com/questions/36130760/use-justify-content-flex-end-and-to-have-vertical-scrollbar
const PusherDowner = styled('div')({
  margin: '0 0 auto'
})

// const Header = styled(LabelHeading)<{isPokerMeeting: boolean | undefined}>(({isPokerMeeting}) => ({
//   borderBottom: `1px solid ${PALETTE.BORDER_LIGHTER}`,
//   margin: '0 0 8px',
//   padding: isPokerMeeting ? '6px 12px 12px' : '6px 12px 12px',
//   textTransform: 'none',
//   width: '100%'
// }))

const Header = styled(LabelHeading)<{isPokerMeeting?: boolean}>(({isPokerMeeting}) => ({
  borderBottom: `1px solid ${PALETTE.BORDER_LIGHTER}`,
  display: 'flex',
  // margin: '0 0 8px',
  padding: isPokerMeeting ? '3px 6px' : '6px 12px 12px',
  textTransform: 'none',
  width: '100%'
}))

const CommentingStatusBlock = styled('div')({
  height: 36,
  width: '100%'
})

const CommentAvatar = styled(Avatar)({
  margin: '8px 4px',
  transition: 'all 150ms'
})

interface Props {
  editorRef: RefObject<HTMLTextAreaElement>
  meeting: DiscussionThreadList_meeting
  preferredNames: string[] | null
  threadSourceId: string
  threadables: DiscussionThreadList_threadables
  dataCy: string
}

const DiscussionThreadList = forwardRef((props: Props, ref: any) => {
  const {editorRef, meeting, threadSourceId, threadables, dataCy, preferredNames} = props
  const {endedAt, meetingType, viewerMeetingMember} = meeting
  const {user} = viewerMeetingMember
  const {picture} = user
  console.log('DiscussionThreadList -> meeting', meeting)
  const isPokerMeeting = meetingType === MeetingTypeEnum.poker
  const isEmpty = threadables.length === 0
  useScrollThreadList(threadables, editorRef, ref, preferredNames)
  const HeaderBlock = () => {
    if (isPokerMeeting) {
      return (
        <Header isPokerMeeting>
          {[1, 2, 3, 4].map((__example, idx) => {
            return <CommentAvatar key={idx} size={32} picture={picture} />
          })}
        </Header>
      )
    }
    return <Header>{'Discussion & Takeaway Tasks'}</Header>
  }
  if (isEmpty) {
    return (
      <EmptyWrapper isPokerMeeting={isPokerMeeting}>
        <HeaderBlock />
        <DiscussionThreadListEmptyState isEndedMeeting={!!endedAt} />
        <CommentingStatusBlock>
          <CommentingStatusText preferredNames={preferredNames} />
        </CommentingStatusBlock>
      </EmptyWrapper>
    )
  }

  return (
    <Wrapper data-cy={`${dataCy}`} isPokerMeeting={isPokerMeeting} ref={ref}>
      <HeaderBlock />
      <PusherDowner />
      {threadables.map((threadable) => {
        const {id} = threadable
        return (
          <ThreadedItem
            key={id}
            threadable={threadable}
            meeting={meeting}
            threadSourceId={threadSourceId}
          />
        )
      })}
      <CommentingStatusText preferredNames={preferredNames} />
    </Wrapper>
  )
})

export default createFragmentContainer(DiscussionThreadList, {
  meeting: graphql`
    fragment DiscussionThreadList_meeting on NewMeeting {
      ...ThreadedItem_meeting
      endedAt
      meetingType
      viewerMeetingMember {
        user {
          picture
        }
      }
    }
  `,

  threadables: graphql`
    fragment DiscussionThreadList_threadables on Threadable @relay(plural: true) {
      ...ThreadedItem_threadable
      id
    }
  `
})
