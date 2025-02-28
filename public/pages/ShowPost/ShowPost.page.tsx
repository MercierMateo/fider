import "./ShowPost.page.scss"

import React from "react"

import { Comment, Post, Tag, Vote, ImageUpload, CurrentUser } from "@fider/models"
import { actions, clearUrlHash, Failure, Fider, notify, timeAgo } from "@fider/services"

import {
  VoteCounter,
  ShowPostResponse,
  Button,
  UserName,
  Moment,
  Markdown,
  Input,
  Form,
  TextArea,
  MultiImageUploader,
  ImageViewer,
  Icon,
  Header,
  PoweredByFider,
} from "@fider/components"
import { ResponseForm } from "./components/ResponseForm"
import { TagsPanel } from "./components/TagsPanel"
import { NotificationsPanel } from "./components/NotificationsPanel"
import { ModerationPanel } from "./components/ModerationPanel"
import { DiscussionPanel } from "./components/DiscussionPanel"
import { VotesPanel } from "./components/VotesPanel"

import IconX from "@fider/assets/images/heroicons-x.svg"
import IconPencilAlt from "@fider/assets/images/heroicons-pencil-alt.svg"
import IconCheck from "@fider/assets/images/heroicons-check.svg"
import { HStack, VStack } from "@fider/components/layout"
import { Trans } from "@lingui/macro"

interface ShowPostPageProps {
  post: Post
  subscribed: boolean
  comments: Comment[]
  tags: Tag[]
  votes: Vote[]
  attachments: string[]
}

interface ShowPostPageState {
  editMode: boolean
  newTitle: string
  attachments: ImageUpload[]
  newDescription: string
  highlightedComment?: number
  error?: Failure
}

const oneHour = 3600
const canEditPost = (user: CurrentUser, post: Post) => {
  if (user.isCollaborator) {
    return true
  }

  return user.id === post.user.id && timeAgo(post.createdAt) <= oneHour
}

export default class ShowPostPage extends React.Component<ShowPostPageProps, ShowPostPageState> {
  constructor(props: ShowPostPageProps) {
    super(props)

    this.state = {
      editMode: false,
      newTitle: this.props.post.title,
      newDescription: this.props.post.description,
      attachments: [],
    }
  }

  public componentDidMount() {
    this.handleHashChange()
    window.addEventListener("hashchange", this.handleHashChange)
  }

  public componentWillUnmount() {
    window.removeEventListener("hashchange", this.handleHashChange)
  }

  private saveChanges = async () => {
    const result = await actions.updatePost(this.props.post.number, this.state.newTitle, this.state.newDescription, this.state.attachments)
    if (result.ok) {
      location.reload()
    } else {
      this.setState({
        error: result.error,
      })
    }
  }

  private setNewTitle = (newTitle: string) => {
    this.setState({ newTitle })
  }

  private setNewDescription = (newDescription: string) => {
    this.setState({ newDescription })
  }

  private setAttachments = (attachments: ImageUpload[]) => {
    this.setState({ attachments })
  }

  private cancelEdit = async () => {
    this.setState({ error: undefined, editMode: false })
  }

  private startEdit = async () => {
    this.setState({ editMode: true })
  }

  private handleHashChange = (e?: Event) => {
    const hash = window.location.hash
    const result = /#comment-([0-9]+)/.exec(hash)

    let highlightedComment
    if (result === null) {
      // No match
      highlightedComment = undefined
    } else {
      // Match, extract numeric ID
      const id = parseInt(result[1])
      if (this.props.comments.map((comment) => comment.id).includes(id)) {
        highlightedComment = id
      } else {
        // Unknown comment
        if (e?.cancelable) {
          e.preventDefault()
        } else {
          clearUrlHash(true)
        }
        notify.error(<Trans id="showpost.comment.unknownhighlighted">Unknown comment ID #{id}</Trans>)
        highlightedComment = undefined
      }
    }
    this.setState({ highlightedComment })
  }

  public render() {
    return (
      <>
        <Header />
        <div id="p-show-post" className="page container">
          <div className="p-show-post">
            <div className="p-show-post__main-col">
              <div className="p-show-post__header-col">
                <VStack spacing={4}>
                  <HStack>
                    <VoteCounter post={this.props.post} />

                    <div className="flex-grow">
                      {this.state.editMode ? (
                        <Form error={this.state.error}>
                          <Input field="title" maxLength={100} value={this.state.newTitle} onChange={this.setNewTitle} />
                        </Form>
                      ) : (
                        <h1 className="text-display2">{this.props.post.title}</h1>
                      )}

                      <span className="text-muted">
                        <Trans id="showpost.label.author">
                          Posted by <UserName user={this.props.post.user} /> &middot; <Moment locale={Fider.currentLocale} date={this.props.post.createdAt} />
                        </Trans>
                      </span>
                    </div>
                  </HStack>
                  <VStack>
                    <span className="text-category">
                      <Trans id="label.description">Description</Trans>
                    </span>
                    {this.state.editMode ? (
                      <Form error={this.state.error}>
                        <TextArea field="description" value={this.state.newDescription} onChange={this.setNewDescription} />
                        <MultiImageUploader field="attachments" bkeys={this.props.attachments} maxUploads={3} onChange={this.setAttachments} />
                      </Form>
                    ) : (
                      <>
                        {this.props.post.description && <Markdown className="description" text={this.props.post.description} style="full" />}
                        {!this.props.post.description && (
                          <em className="text-muted">
                            <Trans id="showpost.message.nodescription">No description provided.</Trans>
                          </em>
                        )}
                        {this.props.attachments.map((x) => (
                          <ImageViewer key={x} bkey={x} />
                        ))}
                      </>
                    )}
                  </VStack>
                  <ShowPostResponse status={this.props.post.status} response={this.props.post.response} />
                </VStack>
              </div>

              <div className="p-show-post__discussion_col">
                <DiscussionPanel post={this.props.post} comments={this.props.comments} highlightedComment={this.state.highlightedComment} />
              </div>
            </div>
            <div className="p-show-post__action-col">
              <VStack spacing={4}>
                <VotesPanel post={this.props.post} votes={this.props.votes} />

                {Fider.session.isAuthenticated && canEditPost(Fider.session.user, this.props.post) && (
                  <VStack>
                    <span key={0} className="text-category">
                      <Trans id="label.actions">Actions</Trans>
                    </span>
                    {this.state.editMode ? (
                      <VStack>
                        <Button variant="primary" onClick={this.saveChanges} disabled={Fider.isReadOnly}>
                          <Icon sprite={IconCheck} />{" "}
                          <span>
                            <Trans id="action.save">Save</Trans>
                          </span>
                        </Button>
                        <Button onClick={this.cancelEdit} disabled={Fider.isReadOnly}>
                          <Icon sprite={IconX} />
                          <span>
                            <Trans id="action.cancel">Cancel</Trans>
                          </span>
                        </Button>
                      </VStack>
                    ) : (
                      <VStack>
                        <Button onClick={this.startEdit} disabled={Fider.isReadOnly}>
                          <Icon sprite={IconPencilAlt} />
                          <span>
                            <Trans id="action.edit">Edit</Trans>
                          </span>
                        </Button>
                        {Fider.session.user.isCollaborator && <ResponseForm post={this.props.post} />}
                      </VStack>
                    )}
                  </VStack>
                )}

                <TagsPanel post={this.props.post} tags={this.props.tags} />
                <NotificationsPanel post={this.props.post} subscribed={this.props.subscribed} />
                <ModerationPanel post={this.props.post} />
              </VStack>
              <PoweredByFider slot="show-post" className="mt-3" />
            </div>
          </div>
        </div>
      </>
    )
  }
}
