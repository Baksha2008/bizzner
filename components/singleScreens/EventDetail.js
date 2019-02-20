import React,{Component} from 'react';
import { View,Text,TouchableOpacity,FlatList,ActivityIndicator,Share,Alert,KeyboardAvoidingView,TextInput,ImageBackground,
    AsyncStorage,RefreshControl,ScrollView,SafeAreaView,Platform,Picker,ActionSheetIOS} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MainStyles from '../StyleSheet';
import {SERVER_URL} from '../../Constants';
import Loader from '../Loader';
import ProgressiveImage from '../../components/AsyncModules/ImageComponent';
import Dialog, { SlideAnimation } from 'react-native-popup-dialog';
import Toast from 'react-native-simple-toast';
import * as AddCalendarEvent from 'react-native-add-calendar-event';
import moment from 'moment';
import Footer from '../Navigation/Footer';
import DatePicker from 'react-native-datepicker';
export default class EventDetail extends Component{
    constructor(props){
        super(props);
        this.state = {
            loading:true,
            event_id:this.props.navigation.getParam('event_id'),
            userList:{},
            curStatus:'',
            eventData:'',
            isRefreshing:false,
            profileDetailShow:false,
            profilePicture:'',
            isLoadingProfile : true,
            userData:[],
            EditEventVisible:false
        }
        this.fetchNewDetails = this._fetchNewDetails.bind(this);
        this.fetchUserData = this._fetchUserData.bind(this);
        this.viewabilityConfig = {
            waitForInteraction: true,
            viewAreaCoveragePercentThreshold: 95
        }
        //this.getEventUsers();
    }
    async setUserId(){
        var userID =  await AsyncStorage.getItem('userID');
        this.setState({userID});
    }
    componentDidMount(){
        this.setUserId();
        setTimeout(()=>{this.fetchNewDetails()},200);
    }
    componentDidUpdate(prevProps,prevState,snapshot){
        var paramEventId = this.props.navigation.getParam('event_id');
        var prevEventId = prevProps.navigation.getParam('event_id')
        if(paramEventId != prevState.event_id){
            this.setState({loading:true,userList:{},eventData:'',curStatus:'',event_id:paramEventId});
            this.fetchNewDetails()
        }
    }
    _fetchNewDetails(){
        var user_id = this.state.userID;
        var eventId = this.state.event_id;
        fetch(SERVER_URL+'?action=getEventUsers&event_id='+eventId+'&user_id='+user_id)
        .then(response=>response.json())
        .then(res=>{
            console.log(res);
            this.setState({loading:false,isRefreshing:false,userList:res.users,eventData:res.event_data,curStatus:res.curStatus});
        })
    }
    formatAMPM(date) {
        var date = new Date(date);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0'+minutes : minutes;
        var strTime = hours + ':' + minutes + ' ' + ampm;
        return strTime;
    }
    formatDate(date){
        var date = new Date(date);
        var dateStr = '';
        dateStr += (date.getDate() < 10)?'0'+date.getDate()+' ':date.getDate()+' ';
        var monthArray = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var month = monthArray[date.getMonth()];
        dateStr += month+' ';
        dateStr += date.getFullYear();
        return dateStr;
    }
    utcDateToString = (momentInUTC) => {
        let s = moment.utc(momentInUTC).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
        // console.warn(s);
        return s;
    };
    setUserEventStatus =  async (statusValue)=>{
        if(statusValue != this.status.curStatus){
            Alert.alert(
                'Add to Calendar?',
                'It will remind you',
                [
                    {
                        text: 'No',
                        onPress: () => console.log('Cancel Pressed'),
                        style: 'cancel',
                    },
                    {text: 'Yes', onPress: () => {
                    var m = moment(new Date(this.state.eventData.unix_event));
                    var mUTC = m.utc();
                    const eventConfig = {
                        title:this.state.eventData.event_subject,
                        startDate: this.utcDateToString(mUTC),
                        endDate: this.utcDateToString(moment.utc(mUTC).add(1, 'hours')),
                        notes: 'tasty!',
                        navigationBarIOS: {
                        tintColor: '#416bb9',
                        backgroundColor: '#8da6d5',
                        titleColor: '#2e4d85',
                        },
                    };
                    AddCalendarEvent.presentEventCreatingDialog(eventConfig)
                    .then((eventInfo) => {})
                    .catch((error) => {console.warn(error);});
                }}],
                {cancelable: true},
            );
        }
        var curItem = this.state.eventData;
        var user_id = this.state.userID;
        
        fetch(SERVER_URL+'?action=changeUserEventStatus&user_id='+user_id+'&event_id='+curItem.group_id+'&status='+statusValue)
        .then(response=>{
            this.fetchNewDetails();
            curStatus = statusValue;
            this.setState({curStatus:statusValue});
            if(statusValue == 1){
                Toast.show('You are interested to this event',Toast.SHORT);
            }
            else if(statusValue == 2){
                Toast.show('You are joined to this event',Toast.SHORT);
            }
            else if(statusValue ==3){
                Toast.show('You have ignored this event',Toast.SHORT);
            }
        })
    }
    _fetchUserData = (user_id)=>{
        this.setState({isLoadingProfile:true,profileDetailShow:true});
        fetch(SERVER_URL+'?action=get_user_data&user_id='+user_id)
        .then(res=>res.json())
        .then(response=>{
            this.setState({userData:response.body,isLoadingProfile:false});
        })
        .catch(err=>{
            console.log(err);
        })
    }
    startPrivateChat(other_user_id){
        this.setState({loading:true})
        fetch(SERVER_URL+'?action=startPrivateChat&user_id='+this.state.userID+'&privateUserId='+other_user_id)
        .then(res=>res.json())
        .then(response=>{
            this.setState({loading:false})
            this.props.navigation.navigate('Private Chat',{event_id:response.privateChatId})
        })
        .catch(err=>{

        });
    }
    async shareThis(){
        try {
            const result = await Share.share({
                message:this.state.eventData.event_subject+' http://bizzner.com/event/'+this.state.event_id,
            },{
                dialogTitle: 'Share '+this.state.eventData.event_subject,
            })
      
            if (result.action === Share.sharedAction) {
              if (result.activityType) {
                // shared with activity type of result.activityType
              } else {
                // shared
              }
            } else if (result.action === Share.dismissedAction) {
              // dismissed
            }
          } catch (error) {
            alert(error.message);
          }
    }
    deleteEvent(){
        var curEvent = this.state.event_id;
        Alert.alert(
            'You want to cancle this event?',
            'This event will be canceled & notify to users',
            [
                {
                    text: 'No',
                    onPress: () => console.log('Cancel Pressed'),
                    style: 'cancel',
                },
                {
                    text: 'Yes',
                    onPress: () => {
                        fetch(SERVER_URL+'?action=cancel_event&event_id='+curEvent)
                        .then(res=>{console.log(res);return res.json()})
                        .then(response=>{
                            console.log(response);
                            this.props.navigation.navigate('Current Events');
                        })
                        .catch(err=>{
                            console.log(err);
                        })
                    }
                }
            ],
            {cancelable: true},
        );
    }
    render(){
        var behavior = (Platform.OS == 'ios')?'padding':'';
        return(
            <SafeAreaView style={MainStyles.normalContainer}>
                <Loader loading={this.state.loading} />
                <View style={[MainStyles.eventsHeader,{justifyContent:'center'}]}>
                    <TouchableOpacity style={{ alignItems:'center',paddingLeft: 12,flexDirection:'row' }} onPress={() => this.props.navigation.goBack() }>
                        <Icon name="chevron-left" style={{ fontSize: 24, color: '#8da6d5' }} />
                        <Text style={{fontSize:16,color:'#8da6d5',marginLeft:20}}>EVENT DETAILS</Text>
                    </TouchableOpacity>
                </View>
                <View style={[MainStyles.tabContainer,{elevation:0,justifyContent:'space-around',alignItems:'center',flexDirection:'row'}]}>
                    <TouchableOpacity style={[
                        MainStyles.tabItem,MainStyles.tabItemActive]} onPress={()=>this.props.navigation.navigate('EventDetail',{event_id:this.state.event_id})}>
                        <Icon name="user-plus" style={[MainStyles.tabItemIcon,MainStyles.tabItemActiveIcon,{fontSize:14}]}/>
                        <Text style={[MainStyles.tabItemIcon,MainStyles.tabItemActiveText,{fontSize:14}]}>Invited to event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>{this.shareThis()}} style={[
                        MainStyles.tabItem
                        ]}>
                        <Icon name="share-alt" style={[MainStyles.tabItemIcon,{fontSize:14}]}/>
                        <Text style={[MainStyles.tabItemIcon,{fontSize:14}]}>Share</Text>
                    </TouchableOpacity>
                    {
                        this.state.curStatus != ''
                        && 
                        <TouchableOpacity style={MainStyles.tabItem} onPress={()=>this.props.navigation.navigate('Event Chat',{event_id:this.state.event_id,note:this.state.eventData.event_note})}>
                            <Icon name="comments" style={[MainStyles.tabItemIcon,{fontSize:14}]}/>
                            <Text style={[MainStyles.tabItemIcon,{fontSize:14}]}>Event chat</Text>
                        </TouchableOpacity>
                    }
                    
                </View>
                {
                    (this.state.curStatus != 1
                    ||
                    this.state.curStatus != 2
                    ||
                    this.state.curStatus != 3)
                    &&
                    this.state.eventData.usersCount < this.state.eventData.usersPlace 
                    &&
                    <View style={[MainStyles.EventScreenTabWrapper,{backgroundColor:'#d1dbed'}]}>
                        <TouchableOpacity style={[
                        MainStyles.EIAButtons,{backgroundColor:'#87d292',borderRadius:0}
                        ]}
                        onPress={()=>this.setUserEventStatus(2)}
                        >
                            {
                                this.state.curStatus == 2 && 
                                <Icon name="check" size={15} style={{color:'#FFF',marginRight:5}}/>
                            }
                            {
                                this.state.curStatus != 2 && 
                                <Text style={{
                                    color:'#FFF',
                                    fontFamily:'Roboto-Medium',
                                    fontSize:14
                                }}>Join</Text>
                            }
                            {/* <Icon name="check" size={15} style={{color:'#FFF',marginRight:5,}}/>
                            <Text style={{
                                color:'#FFF',
                                fontFamily:'Roboto-Medium',
                                fontSize:14
                            }}>Join</Text> */}
                        </TouchableOpacity>
                        <TouchableOpacity style={[
                        MainStyles.EIAButtons,{marginHorizontal:5},{backgroundColor:'#8da6d5',borderRadius:0}
                        ]}
                        onPress={()=>this.setUserEventStatus(1)}
                        >
                            {
                                this.state.curStatus == 1 && 
                                <Icon name="star" size={15} style={{color:'#FFF',marginRight:5}}/>
                            }
                            {
                                this.state.curStatus != 1 && 
                                <Text style={{
                                    color:'#FFF',
                                    fontFamily:'Roboto-Medium',
                                    fontSize:14
                                }}>Interested</Text>
                            }
                            {/* <Icon name="star" size={15} style={{color:'#FFF',marginRight:5,}}/>
                            <Text style={{
                                color:'#FFF',
                                fontFamily:'Roboto-Medium',
                                fontSize:14
                            }}>Interested</Text> */}
                        </TouchableOpacity>
                        <TouchableOpacity style={[
                        MainStyles.EIAButtons,{borderRadius:0},
                        (this.state.curStatus == 3)?{backgroundColor:'#d28787'}:''
                        ]}
                            onPress={()=>this.setUserEventStatus(3)}
                            >
                            <Icon name="ban" size={15} style={{color:'#FFF',marginRight:5,}}/>
                            <Text style={{
                                color:'#FFF',
                                fontFamily:'Roboto-Medium',
                                fontSize:14
                            }}>Ignore</Text>
                        </TouchableOpacity>
                    </View>
                }
                {
                    this.state.eventData.usersCount == 0
                    && 
                    this.state.curStatus != 1
                    &&
                    this.state.curStatus != 2
                    &&
                    this.state.curStatus != 3
                    &&
                    this.state.eventData.usersCount == this.state.eventData.usersPlace 
                    && 
                    <View style={[{paddingVertical:5,backgroundColor:'#8da6d4',justifyContent:'center',alignItems:'center'}]}>
                        <Text style={{color:'#FFF',fontFamily:'Roboto-Medium',fontSize:15}}>No more places available</Text>
                    </View>
                }
                {
                    this.state && this.state.eventData !='' && 
                    <View style={MainStyles.eventDataHeader}>
                        <View style={{width:40,height:40,marginRight:10}}>
                            <ProgressiveImage source={{uri:this.state.eventData.photoUrl}} style={{width:40,height:40}}/>
                        </View>
                        <View style={{justifyContent:'flex-start',paddingRight:10,flexDirection:'column',width:'80%'}}>
                            <Text style={{color:'#03163a',fontFamily:'Roboto-Regular',fontSize:12,flexWrap: 'wrap'}}>
                                {this.state.eventData.group_name}, 
                            </Text>
                            <Text  style={{fontFamily:'Roboto-Light',fontSize:11,flexWrap: 'wrap'}}> {this.state.eventData.group_address.split(" ").splice(0,5).join(" ")}</Text>
                            <Text style={{color:'#39b54a',fontFamily:'Roboto-Medium',fontSize:11,flexWrap: 'wrap'}}>{this.state.eventData.event_subject}</Text>
                            <Text style={{color:'#03163a',fontFamily:'Roboto-Light',fontSize:11,flexWrap: 'wrap'}}>Note: {this.state.eventData.event_note}</Text>
                            <Text style={{color:'#03163a',fontFamily:'Roboto-Light',fontSize:11,flexWrap: 'wrap'}}>Local Time : {this.state.eventData.event_date_formated}</Text>
                        </View>
                        {
                            this.state.userID == this.state.eventData.created_by && 
                            <View style={{
                                justifyContent:'center',
                                alignItems:'center'
                            }}>
                                <TouchableOpacity onPress={()=>this.setState({EditEventVisible:true})} style={{
                                    marginBottom:10
                                }}>
                                    <Icon name="pencil" style={{
                                        fontSize:20,
    
                                    }}/>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={()=>{this.deleteEvent()}}>
                                    <Icon name="trash" style={{
                                        fontSize:20,
                                    }}/>
                                </TouchableOpacity>
                            </View>
                        }
                    </View>
                }
                
                {
                    this.state && this.state.userList && this.state.userList.length > 0 && 
                    <FlatList 
                        data={this.state.userList}
                        renderItem={({item}) => (
                            <View style={[MainStyles.UserListItem,
                                (item.status == "1")?{backgroundColor:'#d1dbed'}:''
                            ]}>
                                <TouchableOpacity style={MainStyles.userListItemImageWrapper}  onPress={()=>this.fetchUserData(item.user_id)}>
                                    <ProgressiveImage source={{uri:item.picUrl}} style={MainStyles.userListItemIWImage} resizeMode="cover"/>
                                </TouchableOpacity>
                                <View style={MainStyles.userListItemTextWrapper}>
                                    <Text style={MainStyles.ULITWName}>{item.name}</Text>
                                    <Text style={MainStyles.ULITWTitle}>{item.title}</Text>
                                    {
                                        this.state.eventData.created_by == item.user_id 
                                        && 
                                        <View style={[MainStyles.ULITWAction,{backgroundColor:'#8da6d5'}]}>
                                            <Icon name="user" style={MainStyles.ULITWActionIcon}/> 
                                            <Text style={MainStyles.ULITWActionText}>OWNER</Text>
                                        </View>
                                    }
                                    {
                                        item.status=="1"
                                        && 
                                        <View style={[MainStyles.ULITWAction,{backgroundColor:'#8da6d5'}]}>
                                            <Icon name="star" style={MainStyles.ULITWActionIcon}/> 
                                            <Text style={MainStyles.ULITWActionText}>INTRESTED</Text>
                                        </View>
                                    }
                                    {
                                        item.status=="2"
                                        && 
                                        <View style={MainStyles.ULITWAction}>
                                            <Icon name="check" style={MainStyles.ULITWActionIcon}/> 
                                            <Text style={MainStyles.ULITWActionText}>ACCEPTED</Text>
                                        </View>
                                    }
                                </View>
                                {
                                    item.user_id != this.state.userID && 
                                    <TouchableOpacity style={MainStyles.ChatIconWrapper} onPress={()=>{this.startPrivateChat(item.user_id)}}>
                                        <Icon name="comment"style={MainStyles.ChatIcon}/>
                                    </TouchableOpacity>
                                }
                            </View>
                        )}
                        refreshControl={
                            <RefreshControl
                                refreshing={this.state.isRefreshing}
                                onRefresh={()=>{this.setState({isRefreshing:true});this.fetchNewDetails()}}
                                title="Pull to refresh"
                                tintColor="#fff"
                                titleColor="#fff"
                                colors={["#2e4d85","red", "green", "blue"]}
                            />
                        }
                        keyExtractor={(item) => item.key}
                        viewabilityConfig={this.viewabilityConfig}
                    />
                }
                <Dialog
                    visible={this.state.profileDetailShow}
                    dialogStyle={[MainStyles.confirmPopup,{width:'95%',padding:0,maxHeight:'95%'}]}
                    dialogAnimation={new SlideAnimation()}
                    containerStyle={{zIndex: 10,flex:1,justifyContent: 'space-between',}}
                    rounded={false}
                    >
                    
                    <View style={[MainStyles.confirmPopupHeader,{alignItems:'center',justifyContent:'flex-start',flexDirection:'row',backgroundColor:'#416bb9'}]}>
                        <TouchableOpacity onPress={()=>this.setState({profileDetailShow:false,isLoadingProfile:true,userData:''})}>
                            <Icon name="times" style={{fontSize:20,color:'#FFF'}}/>
                        </TouchableOpacity>
                        <Text style={{color:'#FFF',fontFamily: 'Roboto-Medium',fontSize:17,marginLeft:20}}>PROFILE DETAILS</Text>
                    </View>
                    <View style={{padding:0,borderWidth: 0,backgroundColor:'#FFF',overflow:'visible'}}>
                        <ScrollView 
                        contentContainerStyle={{
                            paddingHorizontal:0,
                        }}
                        >
                            {
                                this.state.isLoadingProfile 
                                && 
                                <ActivityIndicator size="large"  color="#0947b9" animating={true} />
                            }
                            {
                                !this.state.isLoadingProfile 
                                &&
                                this.state.userData
                                && 
                                <View>
                                    <View style={{
                                    backgroundColor:'#2e4d85',
                                    height:100,
                                    paddingTop: 20,
                                    overflow: 'visible',
                                    alignItems:'center',
                                    }}>
                                        <View style={{
                                            width:120,
                                            height:120,
                                            borderWidth: 5,
                                            borderColor: '#FFF',
                                            borderRadius: 100,
                                            overflow: 'hidden',
                                            position: 'relative',
                                        }}>
                                            <ProgressiveImage source={{uri:this.state.userData.user_pic_thumb}} style={{width:120,height:120}}/>
                                        </View>
                                    </View>
                                    <View style={{
                                        marginTop:50,
                                        alignItems:'center',
                                        justifyContent:'center',
                                    }}>
                                        <Text style={{
                                            fontFamily:'Roboto-Light',
                                            fontSize:20,
                                            color:'#0947b9'
                                        }}>{this.state.userData.first_name} {this.state.userData.last_name}</Text>
                                    </View>
                                    <View style={{
                                        paddingHorizontal:40,
                                        flex:1
                                    }}>
                                        <View style={MainStyles.profileTextItem}>
                                            <Icon name="map-marker" size={16} style={MainStyles.profileTextItemIcon}/>
                                            <Text style={MainStyles.PTIText}>{this.state.userData.country} </Text>
                                        </View>
                                        <View style={MainStyles.profileTextItem}>
                                            <Icon name="adn" size={16} style={MainStyles.profileTextItemIcon}/>
                                            <Text style={MainStyles.PTIText}>{this.state.userData.headline} </Text>
                                        </View>
                                        <View style={MainStyles.profileTextItem}>
                                            <Icon name="briefcase" size={16} style={MainStyles.profileTextItemIcon}/>
                                            <Text style={MainStyles.PTIText}>{this.state.userData.current_position} </Text>
                                        </View>
                                        <View style={MainStyles.profileTextItem}>
                                            <Icon name="camera-retro" size={16} style={MainStyles.profileTextItemIcon}/>
                                            <View style={{alignItems:'flex-start',flexWrap:'wrap'}}>
                                            {
                                                this.state.userData.interests.length > 0 && 
                                                <View style={{
                                                    flex:9,
                                                    flexDirection:'row',
                                                    flexWrap:'wrap',
                                                    alignItems:'center',
                                                    justifyContent:'flex-start'
                                                }}>
                                                    {
                                                    this.state.userData.interests.map((item,key)=>(
                                                        <View key = { key } style={{
                                                        backgroundColor:'#0846b8',
                                                        paddingVertical:5,
                                                        paddingHorizontal:10,
                                                        borderColor:'#0846b8',
                                                        borderRadius:30,
                                                        borderWidth:1,
                                                        textAlign:"center",
                                                        margin:2,
                                                        }}>
                                                        <Text style={{color:'#FFF',fontFamily:'Roboto-Regular',fontSize:13}}>{item.tag_name}</Text>
                                                        </View>
                                                    ))
                                                    }
                                                </View>
                                                }
                                            </View>
                                        </View>
                                    </View>
                                    <View style={{
                                        marginVertical:15,
                                        justifyContent:'center',
                                        alignItems:'center',
                                        marginBottom:70
                                    }}>
                                    {
                                        this.state.userData.ID != this.state.userID && 
                                        <TouchableOpacity style={{
                                            paddingHorizontal:40,
                                            paddingVertical:20,
                                            borderRadius:35,
                                            backgroundColor:'#0947b9'
                                        }}  onPress={()=>{this.startPrivateChat(this.state.userData.ID)}}>
                                            <Text style={{
                                                color:'#FFF',
                                                fontFamily:'Roboto-Regular',
                                                fontSize:18
                                            }}>CHAT</Text>
                                        </TouchableOpacity>
                                    }
                                    </View>
                                </View>
                            }
                        </ScrollView>
                    </View>
                </Dialog>
                <Dialog
                    visible={this.state.EditEventVisible}
                    dialogStyle={[MainStyles.confirmPopup,{width:'95%',padding:0,maxHeight:'95%'}]}
                    dialogAnimation={new SlideAnimation()}
                    containerStyle={{zIndex: 10,flex:1,justifyContent: 'space-between',}}
                    rounded={false}
                    >
                    <View style={[MainStyles.confirmPopupHeader,{alignItems:'center',justifyContent:'flex-start',flexDirection:'row',backgroundColor:'#416bb9'}]}>
                        <TouchableOpacity onPress={()=>{this.setState({EditEventVisible:false,isLocationSet:false,curLocation:{}})}}>
                            <Icon name="times" style={{fontSize:20,color:'#FFF'}}/>
                        </TouchableOpacity>
                        <Text style={{color:'#FFF',fontFamily: 'Roboto-Medium',fontSize:17,marginLeft:20}}>EDIT EVENT</Text>
                    </View>
                    <View style={{padding:0,borderWidth: 0,backgroundColor:'#FFF',overflow:'visible'}} 
                    onStartShouldSetResponderCapture={() => {
                        this.setState({ enableScrollViewScroll: true });
                    }}
                    >
                        <KeyboardAvoidingView behavior={behavior}>
                            <ScrollView 
                            keyboardShouldPersistTaps={'handled'}
                            contentContainerStyle={{
                                paddingHorizontal:0,
                            }}
                            scrollEnabled={this.state.enableScrollViewScroll} 
                            ref={myScroll => (this._myScroll = myScroll)}
                            >
                                {
                                    this.state.isLocationSet == true &&
                                    <View style={{width:'100%',marginTop:0,marginBottom:0, height:150,}}>
                                        <ImageBackground source={{uri:this.state.curLocation.picUrl}} style={{width: '100%', height: 150,flex:1,resizeMode:'center'}} resizeMode="cover">   
                                            <TouchableOpacity style={{position:'absolute',right:10,top:10}} onPress={()=>{this.setState({isLocationSet:false,curLocation:{}})}}>
                                                <Icon name="pencil" size={28} color="#FFF" />
                                            </TouchableOpacity>
                                            <View style={{
                                                    color: 'white',
                                                    position: 'absolute', // child
                                                    bottom: 0, // position where you want
                                                    left: 0,
                                                    paddingLeft:20,
                                                    paddingRight:40,
                                                    paddingBottom:20
                                                }}>
                                                <Text style={{textAlign:'left', color:'#FFF',fontFamily:'Roboto-Regular',fontSize:18}}>{this.state.curLocation.name}</Text>
                                                <Text style={{textAlign:'left',color:'#FFF',fontFamily:'Roboto-Light',fontSize:16}}>{this.state.curLocation.address}</Text>
                                            </View>
                                        </ImageBackground>
                                    </View>
                                }
                                {
                                    this.state.isLocationSet == false && 
                                    <View style={{zIndex:40,paddingHorizontal:15}}>
                                        <View style={[
                                            MainStyles.createEventFWI,{marginTop:10},
                                            (this.state.isFocusedSC == true)?{borderWidth:1,borderColor:'#8da6d4',paddingHorizontal:10}:''
                                            ]}>
                                            <Icon name="search" style={MainStyles.cEFWIIcon}/>
                                            <TextInput style={MainStyles.cEFWITF} 
                                                placeholder="City" 
                                                placeholderTextColor="#03163a" 
                                                underlineColorAndroid="transparent"
                                                onChangeText={(text)=>{this.setState({isSelectedCity:text}),this.onChangeSCDelayed(text)}}
                                                value={this.state.isSelectedCity}
                                                onFocus={()=>this.setState({isFocusedSC:true})}
                                                onBlur={()=>this.setState({isFocusedSC:false})}
                                            />
                                        </View>
                                        {
                                            this.state.isSelectedCity != '' && 
                                            <View style={[
                                                MainStyles.createEventFWI,
                                                {
                                                    marginTop:10,
                                                    
                                                },
                                                (this.state.isFocusedSL == true)?{borderWidth:1,borderColor:'#8da6d4',paddingHorizontal:10}:''
                                                ]}>
                                                <Icon name="map-marker" style={MainStyles.cEFWIIcon}/>
                                                <TextInput style={MainStyles.cEFWITF} 
                                                    placeholder="Places " 
                                                    placeholderTextColor="#03163a" 
                                                    underlineColorAndroid="transparent"
                                                    onChangeText={this.onChangeSLDelayed}
                                                    onFocus={()=>this.setState({isFocusedSL:true})}
                                                    onBlur={()=>this.setState({isFocusedSL:false})}
                                                />
                                            </View>
                                        }
                                        <View style={{flex:1,flexDirection:'row',justifyContent:'flex-end',marginTop:10,}}>
                                            <Text style={{color:'#0947b9',fontFamily:'Roboto-Medium'}}>Add location</Text>
                                        </View>
                                    </View>
                                }
                                {
                                    this.state.SCValue &&  
                                    <View style={[MainStyles.locationItemWrapper,{top:61}]} onStartShouldSetResponderCapture={() => {
                                        this.setState({ enableScrollViewScroll: false });
                                        if (this._myScroll.contentOffset === 0
                                            && this.state.enableScrollViewScroll === false) {
                                            this.setState({ enableScrollViewScroll: true });
                                        }
                                        }}>
                                        {this.state.isLoadingSC && <ActivityIndicator size="large" color="#416bb9"/>}
                                        {
                                            this.state.SCItems.length > 0 && 
                                            <FlatList data={this.state.SCItems}
                                                keyboardShouldPersistTaps={'handled'}
                                                renderItem={({item}) => (
                                                    <TouchableOpacity onPress={()=>this.citySet(item.description)} style={[MainStyles.locationItemBtn]}>
                                                        <View style={{flexWrap: 'wrap',paddingLeft:5,justifyContent:'center', alignItems:'flex-start'}}>
                                                            <Text style={{writingDirection:'ltr',textAlign:'left',fontFamily:'Roboto-Medium'}}>{item.description}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                )}
                                                keyExtractor={(item) => item.place_id}
                                            />
                                        }
                                    </View> 
                                }
                                {
                                    this.state.SLValue &&  
                                    <View style={[MainStyles.locationItemWrapper]} onStartShouldSetResponderCapture={() => {
                                        this.setState({ enableScrollViewScroll: false });
                                        if (this._myScroll.contentOffset === 0
                                            && this.state.enableScrollViewScroll === false) {
                                            this.setState({ enableScrollViewScroll: true });
                                        }
                                        }}>
                                        {this.state.isLoading && <ActivityIndicator size="large" color="#416bb9"/>}
                                        {
                                            this.state.SLItems.length > 0 && 
                                            <FlatList data={this.state.SLItems}
                                                keyboardShouldPersistTaps={'handled'}
                                                renderItem={({item}) => (
                                                    <LocationItem
                                                        {...item}
                                                        fecthDetails={this.fetchDetails}
                                                    />
                                                )}
                                                keyExtractor={(item) => item.place_id}
                                            />
                                        }
                                    </View> 
                                }
                                <View style={{paddingHorizontal:15,marginBottom:15}}>
                                    <View style={[MainStyles.createEventFWI]}>
                                        <Icon name="thumb-tack" style={MainStyles.cEFWIIcon}/>
                                        <TextInput style={MainStyles.cEFWITF} placeholder="Subject" value={this.state.eventData.event_subject} onChangeText={(text)=>{this.setState({NES:text})}} returnKeyType="next" placeholderTextColor="#03163a" underlineColorAndroid="transparent"/>
                                    </View>
                                    <View style={MainStyles.createEventFWI}>
                                        <Icon name="bell" style={MainStyles.cEFWIIcon}/>
                                        <TextInput style={MainStyles.cEFWITF} value={this.state.eventData.event_note} placeholder="Note" onChangeText={(text)=>{this.setState({NEN:text})}} returnKeyType="next" placeholderTextColor="#03163a" underlineColorAndroid="transparent"/>
                                    </View>
                                    <View style={MainStyles.createEventFWI}>
                                        <Icon name="users" style={MainStyles.cEFWIIcon}/>
                                        {
                                            Platform.OS == 'android' && 
                                            <Picker
                                            selectedValue={this.state.eventData.usersPlace}
                                            returnKeyType="next"
                                            style={MainStyles.cEFWIPF}
                                            textStyle={{fontSize: 17,fontFamily:'Roboto-Light'}}
                                            itemTextStyle= {{
                                                fontSize: 17,fontFamily:'Roboto-Light',
                                            }}
                                            itemStyle={[MainStyles.cEFWIPF,{fontSize: 17,fontFamily:'Roboto-Light'}]}
                                            onValueChange={(itemValue, itemIndex) => this.setState({NEUsersCount: itemValue})}>
                                                <Picker.Item label="Number of Attendees" value="" />
                                                <Picker.Item label="5-10" value="10" />
                                                <Picker.Item label="10-15" value="15" />
                                                <Picker.Item label="15-20" value="20" />
                                            </Picker>
                                        }
                                        {
                                            Platform.OS == 'ios' && 
                                            <TouchableOpacity style={[MainStyles.cEFWITF,{alignItems:'center'}]} onPress={()=>{this.pickerIos()}}>
                                                <Text style={{color:'#03163a',fontFamily:'Roboto-Light'}}>{this.state.no_Attendees}</Text>
                                            </TouchableOpacity>
                                            
                                        }
                                    </View>
                                    <View style={{flexDirection:'row',flex:1,justifyContent:'flex-end',marginBottom:20}}>
                                        <View style={MainStyles.createEventFWI}>
                                            <Icon name="calendar" style={MainStyles.cEFWIIcon}/>
                                            <DatePicker
                                                style={{width: '75%'}}
                                                date={this.state.eventData.event_date}
                                                mode="date"
                                                placeholder="Select Date"
                                                format="DD/MM/YYYY"
                                                confirmBtnText="Confirm"
                                                cancelBtnText="Cancel"
                                                showIcon={false} 
                                                onDateChange={(date) => {this.setState({NED: date})}}
                                                customStyles={{
                                                    dateInput:MainStyles.cEFWIDF
                                                }}
                                            />
                                        </View>
                                        <View style={[MainStyles.createEventFWI]}>
                                            <Icon name="clock-o" style={MainStyles.cEFWIIcon}/>
                                            <DatePicker
                                                style={{width: '75%'}}
                                                date={this.state.eventData.event_time}
                                                mode="time"
                                                placeholder="Select Time"
                                                format="HH:mm"
                                                confirmBtnText="Confirm"
                                                cancelBtnText="Cancel"
                                                showIcon={false} 
                                                onDateChange={(time) => {
                                                    var curTime = new Date();
                                                    var choosenDate = this.state.NED.split('/');
                                                    var tim30More = new Date((choosenDate[1]) + "/" + choosenDate[0] + "/" + choosenDate[2] + " " + time+':00');
                                                    var minutes = (tim30More.getTime() - curTime.getTime()) / (60 * 1000);
                                                    if (minutes > 30) { 
                                                        this.setState({NET: time})
                                                    }
                                                    else{
                                                        setTimeout(()=>{
                                                            if(Platform.OS == 'ios'){
                                                                AlertIOS.alert(
                                                                    "Warning",
                                                                    "Please give at least 30 minutes notice before event starts"
                                                                );
                                                            }
                                                            else{
                                                                Toast.show("Please give at least 30 minutes notice before event starts", Toast.LONG)
                                                            }
                                                        },400)
                                                        
                                                    }}}
                                                customStyles={{
                                                    dateInput:MainStyles.cEFWIDF
                                                }}
                                            />
                                        </View>
                                    </View>
                                    <View style={[MainStyles.btnWrapper,{marginBottom:20}]}>
                                        <TouchableOpacity style={[MainStyles.btnSave]} onPress={this.createNewEvent}>
                                            <Text style={MainStyles.btnSaveText}>Edit Event</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </Dialog>
                <Footer />
            </SafeAreaView>
        );
    }
}
