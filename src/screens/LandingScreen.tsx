import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, ImageBackground, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Typography, Spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Landing'>;

const { height } = Dimensions.get('window');

export function LandingScreen() {
  const nav = useNavigation<Nav>();

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ImageBackground
        source={require('../../assets/Gita-Image.png')}
        style={styles.image}
        resizeMode="cover"
      >
        {/* Gradient: transparent → deep dark at bottom */}
        <LinearGradient
          colors={['transparent', 'rgba(10,8,5,0.55)', 'rgba(10,8,5,0.97)']}
          locations={[0.25, 0.55, 0.82]}
          style={styles.gradient}
        >
          {/* Text + CTA anchored to bottom */}
          <View style={styles.content}>
            <Text style={styles.sanskrit}>
              श्रीमद्भगवद्गीता
            </Text>
            <Text style={styles.english}>
              Bhagavad Gita
            </Text>
            <Text style={styles.sub}>
              700 verses · 18 chapters
            </Text>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => nav.navigate('ChapterList')}
              activeOpacity={0.75}
            >
              <Text style={styles.btnText}>Begin Reading</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0805',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: Spacing.screenMargin,
    paddingBottom: 64,
    gap: 10,
  },
  sanskrit: {
    ...Typography.sanskrit,
    fontSize: 26,
    lineHeight: 44,
    color: '#D4A843',        // warm gold — reads off the dark gradient
  },
  english: {
    ...Typography.chapterTitle,
    fontSize: 36,
    color: '#FAFAF7',
    letterSpacing: 0.5,
  },
  sub: {
    ...Typography.ui,
    fontSize: 13,
    color: 'rgba(250,250,247,0.5)',
    marginBottom: 32,
  },
  btn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D4A843',
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  btnText: {
    ...Typography.ui,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#D4A843',
  },
});
