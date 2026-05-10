import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Ekranlarımızı içe aktarıyoruz
import DersEkleScreen from './screens/DersEkleScreen';
import DersProgramiScreen from './screens/DersProgramiScreen';
import DurumKontrolScreen from './screens/DurumKontrolScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Programım"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Ders Ekle') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
            } else if (route.name === 'Programım') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Durum') {
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2ecc71',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Ders Ekle" component={DersEkleScreen} />
        <Tab.Screen name="Programım" component={DersProgramiScreen} />
        <Tab.Screen name="Durum" component={DurumKontrolScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
