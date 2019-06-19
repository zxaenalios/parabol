import SecondaryButton from 'universal/components/SecondaryButton'
import React, {useState} from 'react'
import {createFragmentContainer, graphql} from 'react-relay'
import styled from 'react-emotion'
import {StageTimerModalEndTime_stage} from '__generated__/StageTimerModalEndTime_stage.graphql'
import ms from 'ms'
import SetStageTimerMutation from 'universal/mutations/SetStageTimerMutation'
import useAtmosphere from 'universal/hooks/useAtmosphere'
import useMutationProps from 'universal/hooks/useMutationProps'
import StyledError from 'universal/components/StyledError'
import roundDateToNearestHalfHour from 'universal/utils/roundDateToNearestHalfHour'
import 'universal/styles/daypicker.css'
import StageTimerModalEndTimeDate from './StageTimerModalEndTimeDate'
import StageTimerModalEndTimeHour from 'universal/components/StageTimerModalEndTimeHour'

interface Props {
  closePortal: () => void
  meetingId: string
  stage: StageTimerModalEndTime_stage
}

const Row = styled('div')({
  alignItems: 'center',
  display: 'flex'
})

const SetLimit = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  padding: 16
})

const DEFAULT_DURATION = ms('1d')
const TOMORROW = roundDateToNearestHalfHour(new Date(Date.now() + DEFAULT_DURATION))

const StageTimerModalEndTime = (props: Props) => {
  const {closePortal, meetingId, stage} = props
  const scheduledEndTime = stage.scheduledEndTime as string | null
  const suggestedEndTime = stage.suggestedEndTime as string | null
  const [endTime, setEndTime] = useState(new Date(scheduledEndTime || suggestedEndTime || TOMORROW))

  const atmosphere = useAtmosphere()

  const {submitting, onError, onCompleted, submitMutation, error} = useMutationProps()

  const startTimer = () => {
    if (submitting) return
    submitMutation()
    SetStageTimerMutation(
      atmosphere,
      {meetingId, scheduledEndTime: endTime},
      {onError, onCompleted}
    )
    closePortal()
  }

  return (
    <SetLimit>
      <Row>
        <StageTimerModalEndTimeDate endTime={endTime} setEndTime={setEndTime} />
      </Row>
      <Row>
        <StageTimerModalEndTimeHour endTime={endTime} setEndTime={setEndTime} />
      </Row>
      <SecondaryButton onClick={startTimer}>
        {scheduledEndTime ? 'Update Timebox' : 'Start Timebox'}
      </SecondaryButton>
      {error && <StyledError>{error}</StyledError>}
    </SetLimit>
  )
}

export default createFragmentContainer(
  StageTimerModalEndTime,
  graphql`
    fragment StageTimerModalEndTime_stage on NewMeetingStage {
      suggestedEndTime
      scheduledEndTime
    }
  `
)